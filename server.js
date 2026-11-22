const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();

// Enable gzip/deflate compression for text and script assets
app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(express.json());

const vistaPath = path.join(__dirname, 'public/Vista');

// Caching headers configuration
const staticOptions = {
    maxAge: '7d',
    etag: true,
    index: 'index.htm',
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(webp|jpg|jpeg|png|mp3|woff2?)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (filePath.match(/\.(js|css|txt)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
};

const staticMiddleware = express.static(vistaPath, staticOptions);

// Mount at both '/3DVista' and root '/' to ensure relative paths NEVER 404
app.use('/3DVista', staticMiddleware);
app.use(staticMiddleware);

app.get('/3dvista', (req, res) => {
    res.sendFile(path.join(vistaPath, 'index.htm'));
});

app.get('/', (req, res) => {
    res.redirect('/3DVista/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

