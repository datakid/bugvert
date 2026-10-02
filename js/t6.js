window.onerror = (m, s, l, c) => console.log('ERR ' + m + ' @' + l + ':' + c);
localStorage.clear();
App.boot();
App.loadSample2();
App.go('settings');
