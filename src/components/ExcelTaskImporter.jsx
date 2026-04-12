import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, X } from 'lucide-react';

const TARGET_SHEET = 'PLAN DE CHARGE TSP';

/* ── Column name normalizer ─────────────────────────────────────────────── */
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s\-_]/g, '');

/* ── Known column map: normalized name → field ──────────────────────────── */
const KNOWN_COLS = {
  designation:     'title',
  designations:    'title',
  libelle:         'title',
  intitule:        'title',
  tache:           'title',
  descpostrav:     'descPosTrav',
  descriptionpost: 'descPosTrav',
  description:     'descPosTrav',
  objtechnique:    'objTechnique',
  objetechnique:   'objTechnique',
  objectiftechni:  'objTechnique',
  objtechn:        'objTechnique',
  datedebut:       'dateDebut',
  datededebut:     'dateDebut',
  datedebuts:      'dateDebut',
  datefin:         'dateFin',
  datedefin:       'dateFin',
  designpriorite:  'priorityRaw',
  priorite:        'priorityRaw',
  priorites:       'priorityRaw',
  ordre:           'ordre',
  numordre:        'ordre',
  avis:            'avis',
  type:            'type',
  planentretien:   'planEntretien',
  statutsysteme:   'statutSys',
  statutsys:       'statutSys',
  statutsysteme2:  'statutSys',
  statututilis:    'statutUtilis',
  statututil:      'statutUtilis',
};

/* ── Priority mapping (SAP values → app values) ─────────────────────────── */
function mapPriority(raw) {
  if (!raw && raw !== 0) return 'Moyen';
  const v = String(raw).trim().toLowerCase();
  if (['1', 'vt', 'vh', 'très haute', 'tres haute', 'very high', 'critique', 'critical'].some((x) => v === x || v.startsWith(x)))
    return 'Critique';
  if (['2', 'haute', 'high', 'élevé', 'eleve', 'h'].some((x) => v === x || v.startsWith(x)))
    return 'Élevé';
  if (['4', 'basse', 'faible', 'low', 'l', 'b'].some((x) => v === x || v.startsWith(x)))
    return 'Faible';
  return 'Moyen';
}

/* ── Excel date → YYYY-MM-DD ─────────────────────────────────────────────── */
function parseDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return fmt(val);
  }
  if (typeof val === 'number') {
    // Excel serial date (Windows epoch: Dec 30 1899). Use UTC ms to avoid tz shift.
    const utcMs = Math.round((val - 25569) * 86400000);
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : fmt(d);
  }
  if (typeof val === 'string') {
    // M/D/YYYY or DD/MM/YYYY
    const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      // Heuristic: if first number > 12 it's D/M/YYYY
      const [, a, b, y] = mdy;
      const [mo, dy] = parseInt(a) > 12 ? [b, a] : [a, b];
      // Build UTC date string to avoid timezone shift
      const iso = `${y}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}T00:00:00Z`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : fmt(d);
    }
    // Try ISO or other formats
    const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/) ? val + 'T00:00:00Z' : val;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : fmt(d);
  }
  return null;
}

function fmt(d) {
  // Always use UTC components — avoids off-by-one when the Date is midnight UTC
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * ExcelTaskImporter
 * Props:
 *   onTasksExtracted(tasks: TaskObject[]) — always passes full objects:
 *   { title, date, zone, assetTags, procedure, priority }
 */
export default function ExcelTaskImporter({ onTasksExtracted }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging]       = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [fileName, setFileName]       = useState('');

  // Fallback: column selector when file doesn't match known schema
  const [columns, setColumns]         = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [selectedCol, setSelectedCol] = useState('');

  const isValidExt = (name) => /\.(xlsx|xls)$/i.test(name);

  /* ── Build task objects from rows using detected field map ─────────────── */
  const buildTasks = (rows, fieldMap) => {
    return rows
      .map((row) => {
        const get = (field) => String(row[fieldMap[field]] ?? '').trim();

        const title = get('title');
        if (!title) return null;

        const ordre   = get('ordre');
        const avis    = get('avis');
        const assetParts = [ordre && `Ordre: ${ordre}`, avis && `Avis: ${avis}`].filter(Boolean);

        return {
          title,
          date:      parseDate(row[fieldMap['dateDebut']]),
          zone:      get('zone'),
          assetTags: assetParts.join(' | '),
          procedure: get('procedure'),
          priority:  mapPriority(get('priorityRaw')),
        };
      })
      .filter(Boolean);
  };

  /* ── Core parse logic ──────────────────────────────────────────────────── */
  const parseFile = (file) => {
    setError(''); setSuccess(''); setColumns([]); setPendingRows([]); setSelectedCol('');

    if (!isValidExt(file.name)) {
      setError('Veuillez uploader un fichier .xlsx ou .xls');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames.find(
          (n) => n.trim().toUpperCase() === TARGET_SHEET.toUpperCase()
        );

        if (!sheetName) {
          setError(
            `Feuille '${TARGET_SHEET}' introuvable.\nFeuilles disponibles : ${workbook.SheetNames.join(', ')}`
          );
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        if (!rows.length) {
          setError('Aucune donnée trouvée dans cette feuille.');
          return;
        }

        const allKeys = Object.keys(rows[0]);

        /* Build fieldMap: field → original column key */
        const fieldMap = {};
        for (const key of allKeys) {
          const n = norm(key);
          if (KNOWN_COLS[n]) {
            const field = KNOWN_COLS[n];
            if (!fieldMap[field]) fieldMap[field] = key; // first match wins
          }
        }

        if (fieldMap['title']) {
          /* ── Full structured extraction ─────────────────────────────── */
          // Re-parse with cellDates to get proper Date objects for date fields
          const rowsDated = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { defval: '', raw: true }
          );
          // For date column, use raw numeric values; for others use string version
          const tasks = rowsDated.map((rawRow, i) => {
            const strRow = rows[i];
            const get = (field) => String(strRow[fieldMap[field]] ?? '').trim();
            const title = get('title');
            if (!title) return null;

            const rawDateVal    = fieldMap['dateDebut'] ? rawRow[fieldMap['dateDebut']] : null;
            const rawDateFinVal = fieldMap['dateFin']   ? rawRow[fieldMap['dateFin']]   : null;

            return {
              title,
              ordre:         get('ordre'),
              avis:          get('avis'),
              type:          get('type'),
              objTechnique:  get('objTechnique'),
              priority:      mapPriority(get('priorityRaw')),
              date:          parseDate(rawDateVal),
              dateFin:       parseDate(rawDateFinVal),
              statutSys:     get('statutSys'),
              descPosTrav:   get('descPosTrav'),
              planEntretien: get('planEntretien'),
              statutUtilis:  get('statutUtilis'),
            };
          }).filter(Boolean);

          if (tasks.length === 0) {
            setError('Aucune tâche (Désignation) trouvée dans la feuille.');
            return;
          }

          const datedCount = tasks.filter((t) => t.date).length;
          setSuccess(
            `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}` +
            (datedCount > 0 ? ` · ${datedCount} avec date planifiée` : '')
          );
          setColumns([]);
          setPendingRows([]);
          onTasksExtracted(tasks);
        } else {
          /* ── Fallback: generic text-column selector ─────────────────── */
          const textCols = allKeys.filter((k) =>
            rows.some((r) => typeof r[k] === 'string' && r[k].trim().length > 2)
          );

          if (textCols.length === 0) {
            setError('Aucune colonne Désignation ou colonne texte trouvée dans la feuille.');
            return;
          }

          if (textCols.length === 1) {
            const tasks = rows
              .map((r) => ({ title: String(r[textCols[0]] ?? '').trim(), date: null, zone: '', assetTags: '', procedure: '', priority: 'Moyen' }))
              .filter((t) => t.title.length > 0);
            setSuccess(`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}`);
            onTasksExtracted(tasks);
          } else {
            setColumns(textCols.map((k) => ({ key: k, label: k })));
            setPendingRows(rows);
            setSelectedCol(textCols[0]);
          }
        }
      } catch {
        setError('Erreur lors de la lecture du fichier. Vérifiez que le fichier n\'est pas corrompu.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleColumnConfirm = () => {
    if (!selectedCol || !pendingRows.length) return;
    const tasks = pendingRows
      .map((r) => ({ title: String(r[selectedCol] ?? '').trim(), date: null, zone: '', assetTags: '', procedure: '', priority: 'Moyen' }))
      .filter((t) => t.title.length > 0);
    if (tasks.length === 0) { setError('Aucune tâche trouvée dans la colonne sélectionnée.'); return; }
    setSuccess(`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}`);
    setColumns([]); setPendingRows([]);
    onTasksExtracted(tasks);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const reset = () => {
    setError(''); setSuccess(''); setFileName('');
    setColumns([]); setPendingRows([]); setSelectedCol('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet size={16} className="text-green-600" />
        <label className="text-sm font-semibold text-gray-700">
          Importer depuis le Plan de Charge TSP
          <span className="text-gray-400 font-normal ml-1">(fichier .xlsx)</span>
        </label>
      </div>

      {/* Drop zone */}
      {!success && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-400 hover:bg-green-50/50'
          }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload size={28} className={`mx-auto mb-2 ${dragging ? 'text-green-600' : 'text-gray-300'}`} />
          <p className="text-sm font-semibold text-gray-600">
            {dragging ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier Excel'}
          </p>
          <p className="text-xs text-gray-400 mt-1">ou cliquez pour parcourir</p>
          {fileName && !error && !columns.length && (
            <p className="text-xs text-green-600 mt-2 font-medium">📄 {fileName}</p>
          )}
        </div>
      )}

      {/* Fallback column selector */}
      {columns.length > 0 && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">Plusieurs colonnes texte détectées</p>
          <p className="text-xs text-blue-500 mb-3">Quelle colonne contient les tâches ?</p>
          <div className="relative mb-3">
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white appearance-none pr-8">
              {columns.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleColumnConfirm}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              Importer cette colonne
            </button>
            <button onClick={reset}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold hover:bg-gray-200 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {error.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-red-600">{line}</p>
            ))}
          </div>
          <button onClick={reset} className="text-red-300 hover:text-red-500 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 font-semibold flex-1">{success}</p>
          <button onClick={reset} title="Importer un autre fichier"
            className="text-green-400 hover:text-green-600 flex-shrink-0 text-xs underline">
            Changer
          </button>
        </div>
      )}
    </div>
  );
}
