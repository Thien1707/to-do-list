import { useEffect } from 'react';

/**
 * Modern In-App Confirmation Modal (Replaces browser window.confirm)
 */
export default function ConfirmModal({
  isOpen,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger', // 'danger' | 'primary' | 'success' | 'warning'
  icon = '⚠️',
  onConfirm,
  onClose,
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !loading) onClose();
      if (e.key === 'Enter' && !loading) onConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onConfirm]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      btnBg: '#ef4444',
      btnHover: '#dc2626',
      btnColor: '#ffffff',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconBorder: 'rgba(239, 68, 68, 0.3)',
      iconColor: '#ef4444',
    },
    primary: {
      btnBg: '#3b82f6',
      btnHover: '#2563eb',
      btnColor: '#ffffff',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconBorder: 'rgba(59, 130, 246, 0.3)',
      iconColor: '#3b82f6',
    },
    success: {
      btnBg: '#10b981',
      btnHover: '#059669',
      btnColor: '#ffffff',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconBorder: 'rgba(16, 185, 129, 0.3)',
      iconColor: '#10b981',
    },
    warning: {
      btnBg: '#f59e0b',
      btnHover: '#d97706',
      btnColor: '#ffffff',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconBorder: 'rgba(245, 158, 11, 0.3)',
      iconColor: '#f59e0b',
    },
  };

  const style = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
      style={{
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
      }}
    >
      <div
        className="modal animate-fadein"
        style={{
          maxWidth: 440,
          width: '92vw',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: style.iconBg,
                border: `1px solid ${style.iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              {icon}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            disabled={loading}
            style={{ fontSize: '1rem', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6 }}>
          {typeof message === 'string' ? (
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            background: 'var(--bg-elevated, rgba(0,0,0,0.2))',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
            style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: style.btnBg,
              color: style.btnColor,
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s ease',
            }}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
