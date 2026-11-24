try {
  var meta = document.querySelector('meta[name="color-scheme"]');
  var stored = localStorage.getItem('color-scheme');
  if (meta) {
    meta.content = stored === 'dark' || stored === 'light' ? stored : 'light dark';
  }
} catch {}
