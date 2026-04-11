import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, X } from 'lucide-react';

const TARGET_SHEET = 'PLAN DE CHARGE TSP';

/**
 * ExcelTaskImporter
 * Props:
 *   onTasksExtracted(tasks: string[]) — called with deduplicated task strings
 */
export default function ExcelTaskImporter({ onTasksExtracted }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging]     = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [fileName, setFileName]     = useState('');

  // Column-selection state (when sheet has multiple text columns)
  const [columns, setColumns]       = useState([]);   // [{key, label}]
  const [pendingRows, setPendingRows] = useState([]);  // raw parsed rows
  const [selectedCol, setSelectedCol] = useState('');

  /* ── File validation ───────────────────────────────────────────────── */
  const isValidExt = (name) => /\.(xlsx|xls)$/i.test(name);

  /* ── Core parse logic ──────────────────────────────────────────────── */
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
        const workbook = XLSX.read(data, { type: 'array' });

        // ── Find target sheet ────────────────────────────────────────
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
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) {
          setError('Aucune tâche trouvée dans cette feuille.');
          return;
        }

        // ── Detect text columns ──────────────────────────────────────
        const allKeys = Object.keys(rows[0]);

        // Prefer columns whose header contains task-related keywords
        const TASK_KEYWORDS = ['tâche', 'tache', 'libellé', 'libelle', 'description', 'activité', 'activite', 'travail', 'intitulé', 'intitule'];
        const taskKey = allKeys.find((k) =>
          TASK_KEYWORDS.some((kw) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(kw.replace(/[éèêë]/g, 'e')))
        );

        if (taskKey) {
          // Auto-select the most likely column
          extractAndReturn(rows, taskKey);
        } else {
          // Show column selector — only string-like columns
          const textCols = allKeys.filter((k) =>
            rows.some((r) => typeof r[k] === 'string' && r[k].trim().length > 2)
          );

          if (textCols.length === 0) {
            setError('Aucune colonne texte trouvée dans la feuille.');
            return;
          }

          if (textCols.length === 1) {
            extractAndReturn(rows, textCols[0]);
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

  /* ── Extract tasks from chosen column ──────────────────────────────── */
  const extractAndReturn = (rows, colKey) => {
    const tasks = rows
      .map((r) => String(r[colKey] ?? '').trim())
      .filter((t) => t.length > 0);

    if (tasks.length === 0) {
      setError('Aucune tâche trouvée dans la colonne sélectionnée.');
      return;
    }

    setSuccess(`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''} depuis le Plan de Charge TSP`);
    setColumns([]);
    setPendingRows([]);
    onTasksExtracted(tasks);
  };

  const handleColumnConfirm = () => {
    if (selectedCol && pendingRows.length) extractAndReturn(pendingRows, selectedCol);
  };

  /* ── Drag & drop handlers ───────────────────────────────────────────── */
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

  /* ── Render ─────────────────────────────────────────────────────────── */
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

      {/* Column selector */}
      {columns.length > 0 && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">
            Plusieurs colonnes texte détectées
          </p>
          <p className="text-xs text-blue-500 mb-3">
            Quelle colonne contient les tâches ?
          </p>
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
