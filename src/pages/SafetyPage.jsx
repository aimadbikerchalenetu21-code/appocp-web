import { Shield, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

const PROTOCOLS = [
  { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Équipements de Protection Individuelle', desc: 'Port obligatoire du casque, des gants et des lunettes de protection sur toutes les zones industrielles.' },
  { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  title: 'Consignation / Déconsignation', desc: 'Toute intervention sur équipement sous tension doit suivre la procédure LOTO (Lock Out / Tag Out).' },
  { icon: Shield,        color: 'text-green-700',  bg: 'bg-green-50',  title: 'Permis de Travail', desc: 'Un permis de travail signé est requis avant toute intervention en espace confiné ou en hauteur.' },
  { icon: BookOpen,      color: 'text-emerald-700', bg: 'bg-emerald-50', title: 'Plan d\'Urgence', desc: 'En cas d\'incident, alerter immédiatement le responsable HSE et suivre le plan d\'évacuation affiché.' },
];

export default function SafetyPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Sécurité</h1>
        <p className="text-gray-500 text-sm">Protocoles HSE</p>
      </div>

      {/* Hero banner */}
      <div className="rounded-2xl p-6 mb-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 -translate-y-12 translate-x-12"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        <Shield size={32} className="mb-3 opacity-90" />
        <h2 className="font-bold text-xl mb-1">Consignes de sécurité</h2>
        <p className="text-green-100 text-sm">Respecter en permanence les règles HSE en vigueur sur le site OCP.</p>
      </div>

      <div className="space-y-3">
        {PROTOCOLS.map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm mb-1">{title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
