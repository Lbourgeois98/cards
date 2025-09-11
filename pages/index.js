import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [input, setInput] = useState('');
  const [fullCheck, setFullCheck] = useState(false);
  const [results, setResults] = useState('');

  const handleValidate = async () => {
    const lines = input.trim().split('\n');
    let res = '';
    for (const line of lines) {
      const parts = line.trim().split('|');
      if (parts.length === 5 && parts[0] === 'Live') {
        const [_, cardNumber, cvv, expMonth, expYear] = parts;
        try {
          const response = await axios.post('/api/validate', {
            cardNumber, cvv, expMonth, expYear, fullCheck
          });
          res += `${cardNumber}: ${response.data.reason}\n`;
        } catch (error) {
          res += `${cardNumber}: Error\n`;
        }
      }
    }
    setResults(res);
  };

  return (
    <div className="container">
      <h1>🔥 Exploited Darknet Card Validator 🔥</h1>
      <p>Paste cards: Live|number|cvv|mm|yy|</p>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste here..." />
      <br />
      <label>
        <input type="checkbox" checked={fullCheck} onChange={(e) => setFullCheck(e.target.checked)} />
        Enable real full exploited check
      </label>
      <br />
      <button onClick={handleValidate}>Validate All</button>
      <pre>{results}</pre>
    </div>
  );
}
