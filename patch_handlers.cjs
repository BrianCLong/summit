const fs = require('fs');

const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const handlers = `  const handleItemKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }`;

const newHandlers = `  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }, [navigate]);

  const handleActionClick = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const handleActionKeyDown = useCallback((e: React.KeyboardEvent, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  const handleInvestigationClick = useCallback((id: string) => {
    navigate(\`/explore?investigation=\${id}\`);
  }, [navigate]);

  const handleInvestigationKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/explore?investigation=\${id}\`);
  }, [handleItemKeyDown]);

  const handleAlertClick = useCallback((id: string) => {
    navigate(\`/alerts/\${id}\`);
  }, [navigate]);

  const handleAlertKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/alerts/\${id}\`);
  }, [handleItemKeyDown]);

  const handleCaseClick = useCallback((id: string) => {
    navigate(\`/cases/\${id}\`);
  }, [navigate]);

  const handleCaseKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/cases/\${id}\`);
  }, [handleItemKeyDown]);
`;

content = content.replace(handlers, newHandlers);

fs.writeFileSync(path, content, 'utf8');
