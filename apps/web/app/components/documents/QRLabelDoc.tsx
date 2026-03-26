import { forwardRef, useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface Props {
  order: any
  companySettings?: any
}

export const QRLabelDoc = forwardRef<HTMLDivElement, Props>(({ order, companySettings }, ref) => {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, order.serialNumber, {
        format: 'CODE128',
        width: 2.5,
        height: 70,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000'
      })
    }
  }, [order])

  return (
    <div ref={ref} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      background: 'white',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      boxSizing: 'border-box'
    }}>

      {/* Logo */}
      {companySettings?.logoUrl && (
        <img
          src={companySettings.logoUrl}
          alt="Logo"
          style={{ height: '64px', objectFit: 'contain' }}
        />
      )}

      {/* Company name */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', margin: 0 }}>
          {companySettings?.companyName || 'GenTrack'}
        </h1>
        {companySettings?.headerText && (
          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
            {companySettings.headerText}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: '1px', background: '#ddd' }} />

      {/* Order info */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>Serial number</p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111', margin: 0, fontFamily: 'monospace' }}>
          {order.serialNumber}
        </h2>
      </div>

      {/* QR Code */}
      {order.qrCode && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={order.qrCode}
            alt="QR Code"
            style={{ width: '180px', height: '180px' }}
          />
          <p style={{ fontSize: '11px', color: '#aaa', margin: '8px 0 0' }}>
            Scan to view full history
          </p>
        </div>
      )}

      {/* Barcode */}
      <div style={{ textAlign: 'center' }}>
        <svg ref={barcodeRef} />
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: '1px', background: '#ddd' }} />

      {/* Order details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Client</p>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: 0 }}>
            {order.clientName}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Type</p>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: 0 }}>
            {order.enclosureType} — {order.controlType?.replace('_', ' ')}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Date</p>
          <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
            {new Date(order.createdAt).toLocaleDateString('fr-DZ')}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Status</p>
          <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>{order.status}</p>
        </div>
      </div>

      {/* Footer */}
      {companySettings?.footerText && (
        <p style={{ fontSize: '11px', color: '#aaa', margin: '8px 0 0', textAlign: 'center' }}>
          {companySettings.footerText}
        </p>
      )}
    </div>
  )
})

QRLabelDoc.displayName = 'QRLabelDoc'