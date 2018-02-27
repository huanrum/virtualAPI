require('./bin')({
    port:8888,
    websocket:8800 + Math.floor(Math.random() * 44),
    weinre:8844 + Math.floor(Math.random() * 44)
});

