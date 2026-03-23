import { forwardRef } from 'react'

interface Props {
  order: any
  companySettings?: any
}

export const OrderFabricationDoc = forwardRef<HTMLDivElement, Props>(
  ({ order, companySettings }, ref) => {
    const now = new Date().toLocaleDateString('fr-DZ', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    return (
      <div ref={ref} className="bg-white text-black p-10 min-h-screen font-sans">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {companySettings?.companyName || 'GMI — Groupe Moteur Industriel'}
              </h1>
              {companySettings?.headerText && (
                <p className="text-gray-600 text-sm mt-1">{companySettings.headerText}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">Date</p>
              <p className="font-semibold">{now}</p>
            </div>
          </div>
        </div>

        {/* Document title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold uppercase tracking-widest border-2 border-gray-800 inline-block px-8 py-2">
            Ordre de Fabrication
          </h2>
          <p className="text-gray-500 text-sm mt-2">N° {order.serialNumber}</p>
        </div>

        {/* Client + Engine info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3 border-b pb-2">
              Informations client
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500 w-32">Client</td>
                  <td className="py-1.5 font-medium">{order.clientName}</td>
                </tr>
                {order.clientPhone && (
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Téléphone</td>
                    <td className="py-1.5">{order.clientPhone}</td>
                  </tr>
                )}
                {order.clientEmail && (
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Email</td>
                    <td className="py-1.5">{order.clientEmail}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-gray-500">Date commande</td>
                  <td className="py-1.5">{new Date(order.createdAt).toLocaleDateString('fr-DZ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3 border-b pb-2">
              Spécification moteur
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500 w-32">Type</td>
                  <td className="py-1.5 font-medium">{order.enclosureType}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Commande</td>
                  <td className="py-1.5">{order.controlType?.replace('_', ' ')}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">N° série</td>
                  <td className="py-1.5 font-bold">{order.serialNumber}</td>
                </tr>
                {order.requirements && (
                  <tr>
                    <td className="py-1.5 text-gray-500">Exigences</td>
                    <td className="py-1.5">{order.requirements}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Components table */}
        {order.components?.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3">
              Composants enregistrés
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Catégorie</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Marque</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Modèle</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">N° série</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {order.components.map((comp: any) => (
                  <tr key={comp.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">
                      {comp.equipmentModel?.brand?.category?.replace('_', ' ')}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {comp.equipmentModel?.brand?.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {comp.equipmentModel?.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-mono">
                      {comp.serialNumber}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500">
                      {comp.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phases checklist */}
        <div className="mb-8">
          <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3">
            Suivi des phases de production
          </h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left w-12">N°</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Phase</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Statut</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Début</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Fin</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Durée</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Visa</th>
              </tr>
            </thead>
            <tbody>
              {order.productionPhases?.map((phase: any) => (
                <tr key={phase.phaseNumber}>
                  <td className="border border-gray-300 px-3 py-2 text-center font-bold">
                    {phase.phaseNumber}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {PHASE_NAMES[phase.phaseNumber]}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <span className={`text-xs font-medium ${
                      phase.status === 'COMPLETED' ? 'text-green-600' :
                      phase.status === 'IN_PROGRESS' ? 'text-blue-600' :
                      phase.status === 'BLOCKED' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {phase.status}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-xs">
                    {phase.startedAt ? new Date(phase.startedAt).toLocaleString('fr-DZ') : '—'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-xs">
                    {phase.completedAt ? new Date(phase.completedAt).toLocaleString('fr-DZ') : '—'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-xs">
                    {phase.delayMinutes != null ? `${phase.delayMinutes} min` : '—'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 w-20"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          {['Responsable production', 'Contrôle qualité', 'Client'].map(role => (
            <div key={role} className="text-center">
              <p className="text-xs text-gray-500 mb-8">{role}</p>
              <div className="border-t border-gray-400 pt-1">
                <p className="text-xs text-gray-400">Signature et cachet</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {companySettings?.footerText && (
          <div className="border-t border-gray-300 mt-8 pt-4 text-center text-xs text-gray-400">
            {companySettings.footerText}
          </div>
        )}
      </div>
    )
  }
)

OrderFabricationDoc.displayName = 'OrderFabricationDoc'

const PHASE_NAMES: Record<number, string> = {
  1: 'Transformation tôle / fer',
  2: 'Soudure + Rouleuse + Cisaille',
  3: 'Peinture poudre',
  4: 'Peinture châssis & échappement',
  5: 'Câblage + tableau de commande',
  6: 'Assemblage',
  7: 'Test & mise en service',
  8: 'Contrôle qualité + livraison',
}