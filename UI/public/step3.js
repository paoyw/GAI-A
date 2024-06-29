
async function callModel3() {
    const model2Output = document.getElementById('model2-output').innerText;
    const response = await fetch('/api/model3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: model2Output })
    });
    const data = await response.json();
    document.getElementById('model3-output').innerText = JSON.stringify(data.output);
}
  