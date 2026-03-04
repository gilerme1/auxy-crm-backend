async function run() {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@auxy.com', password: 'password' })
    });
    
    let token = null;
    let data = {};
    if (!res.ok) {
      // Intentar cliente admin
      const res2 = await fetch('http://127.0.0.1:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cliente@auxy.com', password: 'password' })
      });
      data = await res2.json();
      token = data.access_token;
    } else {
      data = await res.json();
      token = data.access_token;
    }

    if (!token) {
      console.error('No token obtained', data);
      return;
    }

    // Call /solicitudes
    console.log('Fetching solicitudes...');
    const list = await fetch('http://127.0.0.1:3001/api/solicitudes', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    console.log('Status:', list.status);
    console.log('Body:', await list.text());

    // Call /usuarios
    console.log('Fetching usuarios...');
    const users = await fetch('http://127.0.0.1:3001/api/usuarios', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Status usuarios:', users.status);
    console.log('Body usuarios:', await users.text());


  } catch (err) {
    console.error(err);
  }
}
run();
