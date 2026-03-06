'use client'

import { useState } from 'react'

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', film: '', understood: '', memory: '',
    surprise: '', lost: '', clarity: '', change: '', return: '', other: ''
  })

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  if (submitted) return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <h2 style={{ color: '#c9a96e', letterSpacing: '0.2em', fontSize: '1rem', marginBottom: '1rem' }}>THANK YOU</h2>
      <p style={{ color: '#666', fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center' }}>Your feedback is now part of what Matinee becomes.<br />We'll be in touch.</p>
    </main>
  )

  const inputStyle = { background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a2a', color: '#e8e0d0', fontFamily: 'Georgia, serif', fontSize: '0.95rem', padding: '0.6rem 0', outline: 'none', width: '100%' }
  const labelStyle = { fontSize: '0.75rem', letterSpacing: '0.15em', color: '#c9a96e', textTransform: 'uppercase' as const }
  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.6rem' }

  return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#e8e0d0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '0.85rem', letterSpacing: '0.35em', color: '#c9a96e', marginBottom: '1.5rem' }}>MATINEE</h1>
        <p style={{ fontSize: '1rem', color: '#888', lineHeight: '1.7', maxWidth: '480px', fontStyle: 'italic' }}>You were one of the first people inside the Studio. Your honest reaction is the most valuable thing you can give us right now.</p>
      </div>

      <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

        <div style={fieldStyle}>
          <label style={labelStyle}>Your Name</label>
          <input style={inputStyle} placeholder="How should we know you" value={form.name} onChange={e => update('name', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Your Email</label>
          <input style={inputStyle} type="email" placeholder="So we can follow up if needed" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #1a1a1a' }} />
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase' }}>The Experience</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>Did Matinee feel like it understood your film?</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} onClick={() => update('understood', String(n))} style={{ width: '40px', height: '40px', border: `1px solid ${form.understood === String(n) ? '#c9a96e' : '#2a2a2a'}`, color: form.understood === String(n) ? '#c9a96e' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>{n}</div>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#444' }}>1 = Not at all &nbsp; 5 = Completely</span>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Was there a moment it surprised you — in a good way?</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.7' }} placeholder="Describe what happened, even briefly" value={form.surprise} onChange={e => update('surprise', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Was there a moment it lost you or felt wrong?</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.7' }} placeholder="Be honest — this is exactly what we need to hear" value={form.lost} onChange={e => update('lost', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Did the memory feel real — did it remember what mattered?</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} onClick={() => update('memory', String(n))} style={{ width: '40px', height: '40px', border: `1px solid ${form.memory === String(n) ? '#c9a96e' : '#2a2a2a'}`, color: form.memory === String(n) ? '#c9a96e' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>{n}</div>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#444' }}>1 = Felt mechanical &nbsp; 5 = Felt alive</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #1a1a1a' }} />
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase' }}>The Film</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>What film did you bring to Matinee?</label>
          <input style={inputStyle} placeholder="A title, or just describe what you were working on" value={form.film} onChange={e => update('film', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Did the conversation help you see your film differently?</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.7' }} placeholder="Even a small shift counts" value={form.clarity} onChange={e => update('clarity', e.target.value)} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #1a1a1a' }} />
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase' }}>Going Forward</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>The one thing you'd change or add</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.7' }} placeholder="If you could ask for anything next" value={form.change} onChange={e => update('change', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Would you come back to Matinee for your next session?</label>
          <select style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }} value={form.return} onChange={e => update('return', e.target.value)}>
            <option value="" disabled>Choose one</option>
            <option value="yes">Yes — without question</option>
            <option value="probably">Probably</option>
            <option value="maybe">Maybe, with improvements</option>
            <option value="no">No — and here's why</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Anything else you want us to know</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.7' }} placeholder="No filter needed here" value={form.other} onChange={e => update('other', e.target.value)} />
        </div>

        <button onClick={() => setSubmitted(true)} style={{ background: 'transparent', border: '1px solid #c9a96e', color: '#c9a96e', fontFamily: 'Georgia, serif', fontSize: '0.8rem', letterSpacing: '0.2em', padding: '1rem 2rem', cursor: 'pointer', width: 'fit-content', marginTop: '1rem' }}>
          SEND MY FEEDBACK
        </button>

      </div>
    </main>
  )
}
