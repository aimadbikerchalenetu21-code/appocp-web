import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTask, createResponsableAccount, getAllAgentNames, getAllResponsables } from '../services/firestoreService';
import {
  User, AlertCircle, CheckCircle, Send, Plus, X,
  CheckSquare, Square, Search, UserPlus, Trash2,
} from 'lucide-react';
import ExcelTaskImporter from '../components/ExcelTaskImporter';

/* ── Colour palette for intervenants ───────────────────────────────── */
const PALETTE = [
  '#16a34a','#2563eb','#d97706','#dc2626',
  '#7c3aed','#0891b2','#be185d','#b45309',
  '#0f766e','#9333ea','#c2410c','#0369a1',
];

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtShort(ymd) {
  if (!ymd) return '';
  const [,m,d] = ymd.split('-');
  return `${d}/${m}`;
}

let _id = 0;
const nextId = () => ++_id;

function makeTask(extra = {}) {
  return {
    id: nextId(), title: '',
    ordre:'', avis:'', type:'', objTechnique:'',
    priority:'Moyen', date:null, dateFin:null,
    statutSys:'', descPosTrav:'', planEntretien:'',
    selected: false, assignedEmail: null,
    ...extra,
  };
}

/* ── Avatar chip ────────────────────────────────────────────────────── */
function Avatar({ color, letter, size = 32 }) {
  return (
    <div className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: color }}>
      {letter}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function AddTaskPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const todayYMD  = toYMD(new Date());

  /* tasks & intervenants */
  const [tasks,        setTasks]        = useState([makeTask()]);
  const [invList,      setInvList]      = useState([]);   // added intervenants
  const [knownAccs,    setKnownAccs]    = useState([]);   // from Firestore

  /* add-intervenant form */
  const [showAddInv,   setShowAddInv]   = useState(false);
  const [invEmail,     setInvEmail]     = useState('');
  const [invPassword,  setInvPassword]  = useState('');
  const [invErr,       setInvErr]       = useState('');
  const [invSuggestions, setInvSuggestions] = useState([]);
  const [showSugg,     setShowSugg]     = useState(false);

  /* ui */
  const [search,       setSearch]       = useState('');
  const [manualInput,  setManualInput]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(null);
  const [globalErr,    setGlobalErr]    = useState('');

  const invEmailRef = useRef(null);

  /* load known accounts */
  useEffect(() => {
    Promise.all([getAllAgentNames(), getAllResponsables()]).then(([agents, resps]) => {
      const all = [
        ...agents.map(a => ({ email: a.email, uid: a.uid, name: a.name || '', type:'agent' })),
        ...resps.map(r => ({ email: r.email, uid: r.uid, name: r.name || '', type:'responsable' })),
      ].filter(x => x.email);
      setKnownAccs(all);
    }).catch(() => {});
  }, []);

  /* ── Derived ──────────────────────────────────────────────────────── */
  const namedTasks    = tasks.filter(t => t.title.trim());
  const selectedTasks = namedTasks.filter(t => t.selected);
  const assignedTasks = namedTasks.filter(t => t.assignedEmail);
  const unassignedTasks = namedTasks.filter(t => !t.assignedEmail);
  const unassignableTasks = namedTasks.filter(t => !t.assignedEmail);
  const allSelected   = unassignableTasks.length > 0 && unassignableTasks.every(t => t.selected);

  const filteredTasks = namedTasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const countFor = (email) => assignedTasks.filter(t => t.assignedEmail === email).length;

  /* ── Task helpers ─────────────────────────────────────────────────── */
  const toggleTask = (id) => setTasks(p => p.map(t =>
    t.id===id && !t.assignedEmail ? {...t, selected:!t.selected} : t
  ));
  const toggleAll  = ()   => {
    // only toggle unassigned tasks
    const unassigned = namedTasks.filter(t => !t.assignedEmail);
    const will = !unassigned.every(t => t.selected);
    setTasks(p => p.map(t => t.title.trim() && !t.assignedEmail ? {...t, selected:will} : t));
  };
  const unassign = (id) => setTasks(p => p.map(t => t.id===id ? {...t, assignedEmail:null, selected:false} : t));

  const addManualTask = () => {
    const title = manualInput.trim();
    if (!title) return;
    setTasks(p => [...p, makeTask({ title, selected: false })]);
    setManualInput('');
  };
  const removeTask = (id) => setTasks(p => p.filter(t => t.id !== id));

  /* ── Excel import ─────────────────────────────────────────────────── */
  const handleTasksExtracted = (imported) => {
    const newTasks = imported.map(t => makeTask({
      title: t.title||'', ordre:t.ordre||'', avis:t.avis||'', type:t.type||'',
      objTechnique:t.objTechnique||'', priority:t.priority||'Moyen',
      date:t.date||null, dateFin:t.dateFin||null,
      statutSys:t.statutSys||'', descPosTrav:t.descPosTrav||'',
      planEntretien:t.planEntretien||'', selected:false,
    }));
    setTasks(newTasks);
  };

  /* ── Add intervenant ──────────────────────────────────────────────── */
  const openAddInv = () => {
    setShowAddInv(true);
    setInvEmail(''); setInvPassword(''); setInvErr('');
    setTimeout(() => invEmailRef.current?.focus(), 50);
  };

  const handleInvEmailChange = (val) => {
    setInvEmail(val); setInvErr('');
    const sugg = knownAccs.filter(a =>
      val.length > 0 &&
      a.email.toLowerCase().includes(val.toLowerCase()) &&
      !invList.find(i => i.email === a.email)
    );
    setInvSuggestions(sugg);
    setShowSugg(sugg.length > 0);
  };

  const confirmAddInv = (overrideEmail, overrideUid, overrideName) => {
    const email = (overrideEmail || invEmail).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInvErr('Email invalide.'); return; }
    if (invList.find(i => i.email === email)) { setInvErr('Déjà ajouté.'); return; }
    const existing = overrideUid ? { uid: overrideUid } : knownAccs.find(a => a.email.toLowerCase()===email);
    const color = PALETTE[invList.length % PALETTE.length];
    setInvList(p => [...p, {
      email, uid: existing?.uid||null, name: overrideName||existing?.name||'',
      color, isNew: !existing, password: existing ? null : invPassword,
    }]);
    setInvEmail(''); setInvPassword(''); setInvErr('');
    setShowAddInv(false); setShowSugg(false);
  };

  const removeInv = (email) => {
    setInvList(p => p.filter(i => i.email !== email));
    setTasks(p => p.map(t => t.assignedEmail===email ? {...t, assignedEmail:null} : t));
  };

  /* ── Assign selected tasks ────────────────────────────────────────── */
  const assignTo = (inv) => {
    if (selectedTasks.length === 0) return;
    setTasks(p => p.map(t =>
      t.selected && t.title.trim() ? {...t, assignedEmail:inv.email, selected:false} : t
    ));
  };

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (assignedTasks.length === 0) return;
    setLoading(true); setGlobalErr('');
    try {
      /* create new accounts */
      const uidMap = {};
      for (const inv of invList) {
        if (!inv.isNew) { uidMap[inv.email] = inv.uid||''; continue; }
        try {
          const created = await createResponsableAccount(inv.email, inv.password||'');
          uidMap[inv.email] = created.uid;
        } catch (e) {
          if (e.message !== 'EMAIL_EXISTS') throw e;
          uidMap[inv.email] = inv.uid||'';
        }
      }
      /* create tasks */
      await Promise.all(assignedTasks.map(task =>
        createTask({
          title:task.title.trim(), ordre:task.ordre.trim(), avis:task.avis.trim(),
          type:task.type.trim(), objTechnique:task.objTechnique.trim(),
          priority:task.priority, dueDate:task.date||todayYMD, dateFin:task.dateFin||'',
          statutSys:task.statutSys.trim(), descPosTrav:task.descPosTrav.trim(),
          planEntretien:task.planEntretien.trim(),
          zone:task.objTechnique.trim(),
          assetTags:[task.ordre,task.avis].filter(Boolean).join(' | '),
          procedure:task.descPosTrav.trim(),
          assignedTo:{ email:task.assignedEmail, uid:uidMap[task.assignedEmail]||'' },
        }, { uid:user.uid, email:user.email })
      ));
      setSuccess({
        total: assignedTasks.length,
        unassigned: unassignedTasks.length,
        invs: invList.filter(i => assignedTasks.some(t => t.assignedEmail===i.email)),
      });
    } catch (e) {
      setGlobalErr('Erreur: ' + e.message);
    } finally { setLoading(false); }
  };

  /* ── Success screen ───────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={34} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {success.total} tâche{success.total>1?'s':''} créée{success.total>1?'s':''}
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Assignées à {success.invs.length} intervenant{success.invs.length>1?'s':''}
          </p>

          {/* Per-intervenant summary */}
          <div className="space-y-2 mb-5">
            {success.invs.map(inv => (
              <div key={inv.email} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-left">
                <Avatar color={inv.color} letter={inv.email[0].toUpperCase()} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{inv.email}</p>
                  {inv.isNew && inv.password && (
                    <p className="text-xs text-gray-400">🔒 {inv.password}</p>
                  )}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ background: inv.color }}>
                  {assignedTasks.filter(t=>t.assignedEmail===inv.email).length} tâches
                </span>
              </div>
            ))}
          </div>

          {success.unassigned > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800 font-semibold">
              ⚠ {success.unassigned} tâche{success.unassigned>1?'s':''} non assignée{success.unassigned>1?'s':''}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {success.invs.filter(i=>i.isNew&&i.password).map(inv => (
              <button key={inv.email} onClick={() => {
                const s = encodeURIComponent('Vos identifiants — Suivi des Travaux Journaliers');
                const b = encodeURIComponent(`Email: ${inv.email}\nMot de passe: ${inv.password}`);
                window.open(`mailto:${inv.email}?subject=${s}&body=${b}`);
              }} className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #415d96, #2f4c84)' }}>
                <Send size={15}/> Envoyer identifiants à {inv.email.split('@')[0]}
              </button>
            ))}
            <button onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-bold hover:bg-gray-200 transition-colors">
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ────────────────────────────────────────────────────── */
  const hasSelection = selectedTasks.length > 0;
  const readyToSubmit = !hasSelection && assignedTasks.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <h1 className="text-lg font-extrabold text-white">Nouvelle tâche</h1>
        <p className="text-green-200 text-xs mt-0.5">Créer et assigner</p>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* Excel importer */}
        <div className="px-4 pt-4">
          <ExcelTaskImporter onTasksExtracted={handleTasksExtracted} />
        </div>

        {/* ── Intervenants panel ──────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">
                <User size={13} className="inline mr-1 text-green-600" />
                Intervenants externes
              </p>
              <button onClick={openAddInv}
                className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <UserPlus size={13}/> Ajouter
              </button>
            </div>

            {/* Added intervenants */}
            {invList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                Ajoutez des intervenants pour assigner les tâches
              </p>
            ) : (
              <div className="space-y-2">
                {invList.map(inv => (
                  <div key={inv.email}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <Avatar color={inv.color} letter={inv.email[0].toUpperCase()} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        {countFor(inv.email)} tâche{countFor(inv.email)!==1?'s':''} assignée{countFor(inv.email)!==1?'s':''}
                        {inv.isNew && <span className="ml-2 text-amber-600 font-semibold">· Nouveau compte</span>}
                      </p>
                    </div>
                    {/* Quick: assign all unassigned */}
                    {unassignedTasks.length > 0 && (
                      <button onClick={() => {
                        setTasks(p => p.map(t =>
                          !t.assignedEmail && t.title.trim() ? {...t, assignedEmail:inv.email, selected:false} : t
                        ));
                      }}
                        title="Assigner toutes les tâches non assignées"
                        className="text-xs font-bold px-2 py-1 rounded-lg border transition-colors"
                        style={{ color: inv.color, borderColor: inv.color+'55', background: inv.color+'11' }}>
                        +Tout
                      </button>
                    )}
                    <button onClick={() => removeInv(inv.email)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add intervenant form (inline) */}
            {showAddInv && (
              <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-bold text-gray-600">Ajouter un intervenant</p>
                <div className="relative">
                  <input ref={invEmailRef}
                    value={invEmail}
                    onChange={e => handleInvEmailChange(e.target.value)}
                    onBlur={() => setTimeout(()=>setShowSugg(false),150)}
                    placeholder="Email de l'intervenant"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 transition-colors" />
                  {/* Suggestions */}
                  {showSugg && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                      {invSuggestions.map(a => (
                        <button key={a.email}
                          onMouseDown={() => confirmAddInv(a.email, a.uid, a.name)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-left">
                          <User size={13} className="text-gray-400 flex-shrink-0"/>
                          <span className="flex-1 truncate">{a.email}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            Existant
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show password field only if email doesn't match a known account */}
                {invEmail && !knownAccs.find(a=>a.email.toLowerCase()===invEmail.trim().toLowerCase()) && (
                  <input type="password" value={invPassword}
                    onChange={e=>setInvPassword(e.target.value)}
                    placeholder="Mot de passe (nouveau compte)"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 transition-colors" />
                )}
                {invEmail && knownAccs.find(a=>a.email.toLowerCase()===invEmail.trim().toLowerCase()) && (
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle size={11}/> Compte existant — aucun mot de passe requis
                  </p>
                )}
                {invErr && <p className="text-xs text-red-500">{invErr}</p>}
                <div className="flex gap-2">
                  <button onClick={() => confirmAddInv()}
                    className="flex-1 py-2 text-sm font-bold text-white rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    Confirmer
                  </button>
                  <button onClick={() => { setShowAddInv(false); setInvEmail(''); setInvErr(''); }}
                    className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Manual task add ────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-2.5 focus-within:border-green-400 transition-colors shadow-sm">
            <Plus size={15} className="text-gray-300 flex-shrink-0"/>
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualTask(); } }}
              placeholder="Ajouter une tâche manuellement... (Entrée pour confirmer)"
              className="flex-1 text-sm text-gray-600 outline-none bg-transparent placeholder-gray-300"
            />
            {manualInput.trim() && (
              <button onClick={addManualTask}
                className="flex-shrink-0 text-xs font-bold text-white px-3 py-1 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                Ajouter
              </button>
            )}
          </div>
        </div>

        {/* ── Task list ──────────────────────────────────────────── */}
        {namedTasks.length > 0 && (
          <div className="px-4 pt-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                {/* Select-all */}
                <button onClick={toggleAll} className="flex-shrink-0">
                  {allSelected
                    ? <CheckSquare size={18} className="text-green-600"/>
                    : <Square size={18} className="text-gray-300"/>}
                </button>
                {/* Search */}
                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                  <Search size={13} className="text-gray-400 flex-shrink-0"/>
                  <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Rechercher une tâche..."
                    className="flex-1 text-sm text-gray-600 outline-none bg-transparent placeholder-gray-400" />
                  {search && <button onClick={()=>setSearch('')}><X size={13} className="text-gray-400"/></button>}
                </div>
                {/* Counts + delete selection */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {selectedTasks.length > 0 ? (
                    <button
                      onClick={() => {
                        const ids = new Set(selectedTasks.map(t => t.id));
                        setTasks(p => p.filter(t => !ids.has(t.id)));
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                      <Trash2 size={12}/> Supprimer ({selectedTasks.length})
                    </button>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                        {assignedTasks.length} ✓
                      </span>
                      {unassignedTasks.length > 0 && (
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                          {unassignedTasks.length} —
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-gray-50">
                {filteredTasks.map(task => {
                  const inv = invList.find(i => i.email === task.assignedEmail);
                  return (
                    <div key={task.id}
                      className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                        task.selected ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}>
                      {/* Checkbox — disabled once assigned */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        disabled={!!task.assignedEmail}
                        className={`flex-shrink-0 ${task.assignedEmail ? 'cursor-default opacity-30' : ''}`}>
                        {task.selected
                          ? <CheckSquare size={17} className="text-green-600"/>
                          : <Square size={17} className="text-gray-300"/>}
                      </button>

                      {/* Title + SAP info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
                        {(task.ordre || task.avis || task.type || task.objTechnique) && (
                          <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                            {task.ordre      && <span className="font-mono">{task.ordre}</span>}
                            {task.avis       && <><span className="text-gray-200">·</span><span className="font-mono">{task.avis}</span></>}
                            {task.type       && <><span className="text-gray-200">·</span><span className="text-blue-400 font-semibold">{task.type}</span></>}
                            {task.objTechnique && <><span className="text-gray-200">·</span><span className="text-green-600">{task.objTechnique}</span></>}
                          </p>
                        )}
                      </div>

                      {/* Date badge */}
                      {task.date && (
                        <span className="text-xs text-gray-400 font-semibold flex-shrink-0">
                          📅{fmtShort(task.date)}
                        </span>
                      )}

                      {/* Assigned avatar */}
                      {inv ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Avatar color={inv.color} letter={inv.email[0].toUpperCase()} size={26}/>
                          <button onClick={() => unassign(task.id)}
                            title="Désassigner"
                            className="p-0.5 rounded-full text-gray-300 hover:text-amber-500 transition-colors">
                            <X size={11}/>
                          </button>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-200 flex-shrink-0"/>
                      )}
                      {/* Delete button — always visible */}
                      <button onClick={() => removeTask(task.id)}
                        title="Supprimer"
                        className="p-1 rounded-lg text-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {globalErr && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15}/> {globalErr}
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 shadow-lg">

        {/* WHEN tasks are selected → show assign-to buttons */}
        {hasSelection && invList.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-gray-500 mb-2">
              Assigner <span className="text-green-700">{selectedTasks.length} tâche{selectedTasks.length>1?'s':''}</span> à :
            </p>
            <div className="flex gap-2 flex-wrap">
              {invList.map(inv => (
                <button key={inv.email} onClick={() => assignTo(inv)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 shadow-sm"
                  style={{ background: inv.color }}>
                  <Avatar color="rgba(255,255,255,0.3)" letter={inv.email[0].toUpperCase()} size={22}/>
                  <span className="truncate max-w-[140px]">{inv.email.split('@')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WHEN tasks are selected but no intervenants yet → prompt to add */}
        {hasSelection && invList.length === 0 && (
          <div className="px-4 py-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0"/>
            <p className="text-sm text-amber-700 font-semibold flex-1">
              {selectedTasks.length} tâche{selectedTasks.length>1?'s':''} sélectionnée{selectedTasks.length>1?'s':''} — ajoutez un intervenant d'abord
            </p>
            <button onClick={openAddInv}
              className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <UserPlus size={13}/> Ajouter
            </button>
          </div>
        )}

        {/* SUBMIT bar */}
        <div className="px-4 pb-4 pt-2">
          {readyToSubmit ? (
            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-4 text-sm font-extrabold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1c3b72, #0f2347)' }}>
              <Send size={16}/>
              {loading ? 'Création en cours...' : `Créer ${assignedTasks.length} tâche${assignedTasks.length>1?'s':''} pour ${invList.filter(i=>assignedTasks.some(t=>t.assignedEmail===i.email)).length} intervenant${invList.length>1?'s':''}`}
            </button>
          ) : (
            <div className="flex items-center justify-between py-1">
              <p className="text-xs text-gray-400">
                {assignedTasks.length > 0
                  ? `${assignedTasks.length} assignée${assignedTasks.length>1?'s':''} · ${unassignedTasks.length} restante${unassignedTasks.length>1?'s':''}`
                  : 'Sélectionnez des tâches puis assignez-les'}
              </p>
              {assignedTasks.length > 0 && hasSelection && (
                <span className="text-xs text-amber-600 font-semibold">
                  Finissez la sélection en cours
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
