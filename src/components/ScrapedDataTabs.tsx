"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Mail, Phone, Printer } from "lucide-react"

interface ScrapedDataTabsProps {
  scrapedData: any
  extractedData?: Record<string, unknown> | null
}

type TabKey = "email" | "resumo" | "lineitems" | "cdrl" | "json"

export default function ScrapedDataTabs({ scrapedData, extractedData }: ScrapedDataTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(extractedData ? "email" : "resumo")
  const [expandedLineItems, setExpandedLineItems] = useState<Set<number>>(new Set())
  const [expandedCdrls, setExpandedCdrls] = useState<Set<number>>(new Set())

  if (!scrapedData) return null

  const sd = scrapedData
  const neco = sd.neco || sd
  const lineItems: any[] = neco?.lineItems || sd.lineItems || []
  const cdrlItems: any[] = neco?.cdrlItems || sd.cdrlItems || []

  // Se nao tem dados NECO nem lineItems nem extractedData, nao renderiza tabs
  if (!sd.neco && !sd.lineItems && !extractedData) return null

  const toggleLineItem = (idx: number) => {
    setExpandedLineItems(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const toggleCdrl = (idx: number) => {
    setExpandedCdrls(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const expandAllLineItems = () => {
    setExpandedLineItems(new Set(lineItems.map((_, i) => i)))
  }

  const collapseAllLineItems = () => {
    setExpandedLineItems(new Set())
  }

  const tabs = [
    ...(extractedData ? [{ key: "email" as const, label: "Dados do Email" }] : []),
    { key: "resumo" as const, label: "Resumo" },
    { key: "lineitems" as const, label: `Line Items (${lineItems.length})` },
    ...(cdrlItems.length > 0 ? [{ key: "cdrl" as const, label: `CDRL (${cdrlItems.length})` }] : []),
    { key: "json" as const, label: "JSON" },
  ]

  return (
    <div className="mt-3">
      {/* === TAB BAR === */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-700 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TAB: EMAIL === */}
      {activeTab === "email" && extractedData && (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-3">
            {(() => {
              const entries = Object.entries(extractedData)
                .filter(([, v]) => v != null && v !== "")
              const total = entries.length
              const remainder = total % 3
              return entries.map(([key, value], idx) => {
                const col = idx % 3
                const row = Math.floor(idx / 3)
                const isLast = idx === total - 1
                const colsToSpan = isLast && remainder !== 0 ? 4 - remainder : 1
                const span = colsToSpan === 3 ? "col-span-3" : colsToSpan === 2 ? "col-span-2" : ""
                return (
                  <div
                    key={key}
                    className={`px-3 py-1.5 ${span} ${row > 0 ? "border-t border-gray-200" : ""} ${col > 0 ? "border-l border-gray-200" : ""}`}
                  >
                    <div className="text-[10px] font-medium text-gray-400 uppercase truncate">{key}</div>
                    <div className="text-xs text-gray-900 font-medium break-all leading-tight mt-0.5">
                      {String(value)}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* === TAB: RESUMO === */}
      {activeTab === "resumo" && (
        <div className="space-y-3">
          {/* Header Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sd.contractType && <InfoCard label="Contrato" value={sd.contractType} />}
            {sd.purchaseCategory && <InfoCard label="Categoria" value={sd.purchaseCategory} />}
            {sd.transPurpose && <InfoCard label="Proposito" value={sd.transPurpose} />}
            {sd.issueDate && <InfoCard label="Emissao" value={sd.issueDate} />}
            {sd.closingDate && <InfoCard label="Fechamento" value={`${sd.closingDate} ${sd.closingTime || ""}`} />}
            {sd.leadTimeDays && <InfoCard label="Lead Time" value={`${sd.leadTimeDays} dias`} bold />}
            {sd.setAside && <InfoCard label="Set-Aside" value={sd.setAside} />}
            {sd.fsc && <InfoCard label="FSC" value={sd.fsc} mono />}
          </div>

          {/* Buyer / Contact */}
          {(sd.buyerName || sd.buyerEmail || sd.buyerPhone || sd.buyerDodaac) && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-semibold text-blue-500 uppercase mb-2">Buyer / Contact</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {sd.buyerName && (
                  <div>
                    <div className="text-[10px] text-gray-400">Nome</div>
                    <div className="text-gray-900">{sd.buyerName}</div>
                  </div>
                )}
                {sd.buyerEmail && (
                  <div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> Email</div>
                    <a href={`mailto:${sd.buyerEmail}`} className="text-blue-600 hover:underline break-all">{sd.buyerEmail}</a>
                  </div>
                )}
                {sd.buyerPhone && (
                  <div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Telefone</div>
                    <div className="text-gray-900">{sd.buyerPhone}</div>
                  </div>
                )}
                {sd.buyerFax && (
                  <div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1"><Printer className="w-2.5 h-2.5" /> Fax</div>
                    <div className="text-gray-900">{sd.buyerFax}</div>
                  </div>
                )}
                {(sd.buyerDodaac || sd.buyerEntity) && (
                  <div>
                    <div className="text-[10px] text-gray-400">DODAAC / Entity</div>
                    <div className="text-gray-900 font-mono">{sd.buyerDodaac}{sd.buyerEntity ? ` - ${sd.buyerEntity}` : ""}</div>
                  </div>
                )}
                {sd.buyerCity && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-gray-400">Endereco</div>
                    <div className="text-gray-900">{sd.buyerCity}, {sd.buyerState} {sd.buyerZip}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOB */}
          {sd.fobPoint && (
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-amber-800 font-medium">
                FOB: {sd.fobPoint}
              </span>
              {sd.shipmentPayment && <span className="text-gray-500">{sd.shipmentPayment}</span>}
              {sd.acceptancePoint && <span className="text-gray-500">Acceptance: {sd.acceptancePoint}</span>}
            </div>
          )}
        </div>
      )}

      {/* === TAB: LINE ITEMS === */}
      {activeTab === "lineitems" && lineItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              {lineItems.length} Line Items, {lineItems.reduce((s: number, li: any) => s + (li.subLineItems?.length || 0), 0)} Sub-Items
            </h4>
            <div className="flex gap-1">
              <button onClick={expandAllLineItems} className="text-[10px] text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50">Expandir Todos</button>
              <button onClick={collapseAllLineItems} className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100">Recolher</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {lineItems.map((li: any, idx: number) => {
              const isExpanded = expandedLineItems.has(idx)
              return (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleLineItem(idx)} className="w-full text-left flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-400">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
                    <span className="text-xs font-bold text-gray-800 font-mono">{li.lineItem}</span>
                    {li.nomenclature && <span className="text-xs text-gray-600 truncate flex-1">{li.nomenclature}</span>}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-shrink-0">
                      {li.nsn && <span className="font-mono">NSN: {li.nsn}</span>}
                      {li.quantity && <span className="font-semibold">{li.quantity} {li.unit || ""}</span>}
                      {li.vendorCode && <span className="font-mono">CAGE: {li.vendorCode}</span>}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {li.nsn && <div><span className="text-gray-400">NSN:</span> <span className="font-mono text-gray-900">{li.nsn}</span></div>}
                        {li.vendorCode && <div><span className="text-gray-400">CAGE:</span> <span className="font-mono text-gray-900">{li.vendorCode}</span></div>}
                        {li.vendorPartNumber && <div><span className="text-gray-400">Part#:</span> <span className="font-mono text-gray-900">{li.vendorPartNumber}</span></div>}
                        {li.materialControlCode && <div><span className="text-gray-400">MCC:</span> <span className="text-gray-900">{li.materialControlCode}</span></div>}
                        {li.shelfLifeCode && <div><span className="text-gray-400">Shelf-Life:</span> <span className="text-gray-900">{li.shelfLifeCode}</span></div>}
                      </div>
                      {li.subLineItems?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Sub-Line Items ({li.subLineItems.length})</div>
                          <div className="space-y-1">
                            {li.subLineItems.map((sub: any, si: number) => (
                              <div key={si} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs bg-gray-50 rounded px-3 py-1.5">
                                <span className="font-mono font-bold text-gray-800">{sub.subLineItem}</span>
                                {sub.quantity != null && <span className="text-gray-700">{sub.quantity} {sub.unit || ""}</span>}
                                {sub.unitPrice && <span className="text-gray-500">{sub.unitPrice}</span>}
                                {sub.dodaac && <span className="font-mono text-gray-500">DODAAC: {sub.dodaac}</span>}
                                {sub.markFor && <span className="text-gray-500">MARK: {sub.markFor}</span>}
                                {sub.condition && <span className="text-gray-500 italic">{sub.condition}</span>}
                                {sub.cityStateZip && <span className="text-gray-400">{sub.cityStateZip}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(li.weight || li.volume || li.packSize) && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">Physical:</span>
                          {li.weight && <span>Weight: {li.weight}</span>}
                          {li.volume && <span>Volume: {li.volume}</span>}
                          {li.packSize && <span>Pack: {li.packSize} {li.packUnit || ""}</span>}
                          {li.dimensions && <span>Dim: {li.dimensions}</span>}
                        </div>
                      )}
                      {(li.sowText || li.drawingNumbers?.length > 0 || li.documentReferences?.length > 0) && (
                        <details className="border border-gray-100 rounded">
                          <summary className="px-3 py-1.5 cursor-pointer text-xs font-medium text-gray-600 hover:bg-gray-50">
                            SOW / Clause References
                            {li.drawingNumbers?.length > 0 && ` (${li.drawingNumbers.length} drawings)`}
                            {li.documentReferences?.length > 0 && ` (${li.documentReferences.length} docs)`}
                          </summary>
                          <div className="px-3 pb-2 space-y-1.5">
                            {li.drawingNumbers?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {li.drawingNumbers.map((d: string, di: number) => (
                                  <span key={di} className="inline-flex px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono">{d}</span>
                                ))}
                              </div>
                            )}
                            {li.documentReferences?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {li.documentReferences.map((d: string, di: number) => (
                                  <span key={di} className="inline-flex px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-mono">{d}</span>
                                ))}
                              </div>
                            )}
                            {li.sowText && (
                              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 rounded p-2">{li.sowText}</pre>
                            )}
                          </div>
                        </details>
                      )}
                      {li.packagingCodes && Object.keys(li.packagingCodes).length > 0 && (
                        <details className="border border-gray-100 rounded">
                          <summary className="px-3 py-1.5 cursor-pointer text-xs font-medium text-gray-600 hover:bg-gray-50">
                            Packaging Codes ({Object.keys(li.packagingCodes).length})
                            {li.packagingStandard && <span className="text-gray-400 ml-1">- {li.packagingStandard}</span>}
                          </summary>
                          <div className="px-3 pb-2">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[11px]">
                              {Object.entries(li.packagingCodes).map(([k, v]: [string, any]) => (
                                <div key={k} className="flex gap-1">
                                  <span className="text-gray-400">{k}:</span>
                                  <span className="font-mono text-gray-700">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === TAB: CDRL === */}
      {activeTab === "cdrl" && cdrlItems.length > 0 && (
        <div className="space-y-1">
          {cdrlItems.map((cdrl: any, idx: number) => {
            const isExpanded = expandedCdrls.has(idx)
            return (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => toggleCdrl(idx)} className="w-full text-left flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-gray-400">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
                  <span className="text-xs font-bold text-gray-800 font-mono">{cdrl.cdrlItem}</span>
                  {cdrl.title && <span className="text-xs text-gray-600 truncate flex-1">{cdrl.title}</span>}
                  {cdrl.leadTimeDays && <span className="text-[11px] text-gray-500 flex-shrink-0">{cdrl.leadTimeDays}d</span>}
                </button>
                {isExpanded && (
                  <div className="px-4 py-2 border-t border-gray-100 text-xs space-y-2">
                    {cdrl.subtitle && <div className="text-gray-600">{cdrl.subtitle}</div>}
                    {cdrl.descriptionType && <div><span className="text-gray-400">Tipo:</span> {cdrl.descriptionType}</div>}
                    {cdrl.leadTime && <div><span className="text-gray-400">Lead Time:</span> {cdrl.leadTime}</div>}
                    {cdrl.agencyQualifier && <div><span className="text-gray-400">Agency:</span> {cdrl.agencyQualifier}</div>}
                    {cdrl.codeListQualifier && <div><span className="text-gray-400">Frequency:</span> {cdrl.industryList || cdrl.codeListQualifier}</div>}
                    {cdrl.referenceNumbers?.length > 0 && (
                      <div>
                        <span className="text-gray-400">Referencias:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {cdrl.referenceNumbers.map((r: string, ri: number) => (
                            <span key={ri} className="inline-flex px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-mono">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {cdrl.referenceDetails?.length > 0 && (
                      <div>
                        <span className="text-gray-400">Detalhes:</span>
                        <div className="space-y-0.5 mt-0.5">
                          {cdrl.referenceDetails.map((d: string, di: number) => (
                            <div key={di} className="text-gray-600 text-[11px]">{d}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {cdrl.clauseReferences?.length > 0 && (
                      <div>
                        <span className="text-gray-400">Clausulas:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {cdrl.clauseReferences.map((c: string, ci: number) => (
                            <span key={ci} className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-mono">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {cdrl.shipToLocations?.length > 0 && (
                      <div><span className="text-gray-400">Ship To:</span> {cdrl.shipToLocations.map((s: any) => s.entity || s).join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* === TAB: JSON === */}
      {activeTab === "json" && (
        <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
          {JSON.stringify(scrapedData, null, 2)}
        </pre>
      )}
    </div>
  )
}

// Sub-component
function InfoCard({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase">{label}</div>
      <div className={`text-sm text-gray-900 ${mono ? "font-mono" : ""} ${bold ? "font-semibold" : "font-medium"} truncate`}>{value}</div>
    </div>
  )
}
