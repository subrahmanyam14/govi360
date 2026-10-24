import React, { useState } from "react";

export default function Login({ users, onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  const submit = () => {
    const f = users.find((x) => x.username === u && x.password === p);
    f ? onLogin(f) : alert("Invalid username or password");
  };

  return (
    <div className="login">
      <div className="md">
        <h3 style={{ marginTop: 0 }}>📦 Govi360X – Sign in</h3>
        <label>Username</label>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          autoComplete="username"
        />
        <label>Password</label>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <div className="acts">
          <button className="p" style={{ width: "100%" }} onClick={submit}>
            Login
          </button>
        </div>
        <p className="muted">Demo admin login: admin / admin123</p>
      </div>
    </div>
  );
}