import { Shield, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

const PROTOCOLS = [
  { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Équipements de Protection Individuelle', desc: 'Port obligatoire du casque, des gants et des lunettes de protection sur toutes les zones industrielles.' },
  { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  title: 'Consignation / Déconsignation', desc: 'Toute intervention sur équipement sous tension doit suivre la procédure LOTO (Lock Out / Tag Out).' },
  { icon: Shield,        color: 'text-blue-600',   bg: 'bg-blue-50',   title: 'Permis de Travail', desc: 'Un permis de travail signé est requis avant toute intervention en espace confiné ou en hauteur.' },
  { icon: BookOpen,      color: 'text-purple-600', bg: 'bg-purple-50', title: 'Plan d\'Urgence', desc: 'En cas d\'incident, alerter immédiatement le responsable HSE et suivre le plan d\'évacuation affiché.' },
];

export default function SafetyPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Sécurité</h1>
        <p className="text-gray-500 text-sm">Protocoles HSE</p>
      </div>

      <div className="bg-primary rounded-2xl p-5 mb-6 text-white">
        <Shield size={28} className="mb-3 opacity-90" />
        <h2 className="font-bold text-lg mb-1">Consignes de sécurité</h2>
        <p className="text-blue-100 text-sm">Respecter en permanence les règles HSE en vigueur sur le site OCP.</p>
      </div>

      <div className="space-y-3">
        {PROTOCOLS.map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
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
