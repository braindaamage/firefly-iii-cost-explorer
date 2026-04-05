import { Link } from 'react-router-dom'

interface HeaderProps {
  showSettings: boolean
}

export function Header({ showSettings }: HeaderProps) {
  return (
    <header
      style={{
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #3c4043',
        height: '56px',
        paddingLeft: '24px',
        paddingRight: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Firefly III logo"
        >
          <path
            d="M12 2C10 5 8 7 9 10C7 8.5 6.5 7 7 5C5 7 4 10 5 13C3.5 12 3 10.5 3.5 9C2 11 2 14 4 16.5C4.5 18 6 19.5 8 20.5C7.5 19 7.5 17.5 8.5 16.5C9 18 10.5 19 12 19C13.5 19 15 18 15.5 16.5C16.5 17.5 16.5 19 16 20.5C18 19.5 19.5 18 20 16.5C22 14 22 11 20.5 9C21 10.5 20.5 12 19 13C20 10 19 7 17 5C17.5 7 17 8.5 15 10C16 7 14 5 12 2Z"
            fill="#f9a825"
          />
        </svg>
        <span
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 500,
            fontSize: '16px',
            color: '#e8eaed',
            letterSpacing: '0.4px',
          }}
        >
          Firefly III Cost Explorer
        </span>
      </div>

      {showSettings && (
        <Link
          to="/config"
          aria-label="Settings"
          style={{
            color: '#9aa0a6',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </Link>
      )}
    </header>
  )
}
