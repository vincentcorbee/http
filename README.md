Security-Oriented Notes
- Header size limit: Add a max length (e.g., 8KB) for all headers combined to avoid DoS attacks.
- Max number of headers: Limit header count (e.g., 100) to avoid header bombs.
- Slowloris protection: Set timeouts on socket.setTimeout() for idle connections that send partial headers slowly.
- Line length limit: Individual header lines or request lines longer than 8KB should also trigger a 400.
