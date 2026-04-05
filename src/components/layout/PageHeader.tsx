interface PageHeaderProps {
  title: string
  subtitle: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <h1
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 500,
          fontSize: '24px',
          color: '#e8eaed',
          letterSpacing: '-0.6px',
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 400,
          fontSize: '14px',
          color: '#9aa0a6',
          margin: 0,
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}
