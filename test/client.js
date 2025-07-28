const socket = new WebSocket('ws://localhost:8080');
socket.addEventListener('message', event => {
  console.log(event)
  try {
    const receivedData = JSON.parse(event.data);
    console.log('Received JSON:', receivedData);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    console.log('Received data was:', event.data);
  }
});
socket.addEventListener('open', () => {
  const data = { type: 'message', content: 'Hello from Node.js!' };
  socket.send(JSON.stringify(data));

  console.log('Sent JSON:', data);
});
