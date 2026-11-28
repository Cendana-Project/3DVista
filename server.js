const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

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

// Helper to serve index.htm with dynamic cache-busting version query params
function serveIndexHtml(req, res) {
    const indexPath = path.join(vistaPath, 'index.htm');
    fs.readFile(indexPath, 'utf-8', (err, html) => {
        if (err) return res.status(500).send('Error loading page');

        let cssMtime = Date.now();
        let jsMtime = Date.now();
        try {
            cssMtime = Math.floor(fs.statSync(path.join(vistaPath, 'custom.css')).mtimeMs);
        } catch (e) {}
        try {
            jsMtime = Math.floor(fs.statSync(path.join(vistaPath, 'custom.js')).mtimeMs);
        } catch (e) {}

        // Dynamically inject latest version timestamp into HTML
        const updatedHtml = html
            .replace(/href=["']custom\.css(?:\?[^"']*)?["']/i, `href="custom.css?v=${cssMtime}"`)
            .replace(/src=["']custom\.js(?:\?[^"']*)?["']/i, `src="custom.js?v=${jsMtime}"`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(updatedHtml);
    });
}

// Handle index.htm entry routes with cache-busting and proper trailing-slash redirect
app.get(['/', '/3dvista', '/3dvista/', '/index.htm', '/3dvista/index.htm'], (req, res) => {
    if (req.path === '/') {
        return res.redirect('/3DVista/');
    }
    if (req.path.toLowerCase() === '/3dvista') {
        return res.redirect('/3DVista/');
    }
    serveIndexHtml(req, res);
});

// Caching headers configuration for static assets
const staticOptions = {
    maxAge: '7d',
    etag: true,
    index: false, // Handled above by serveIndexHtml
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(webp|jpg|jpeg|png|mp3|woff2?)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (filePath.match(/\.(js|css)$/i)) {
            // Always revalidate CSS and JS so modifications are fetched immediately without hard refresh
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
    }
};

// Showcase Inovasi (/team). staticOptions disables directory indexes, so serve the page
// explicitly. The trailing slash matters: team.css, team.js and data/ are relative URLs.
app.get(['/team', '/3DVista/team'], (req, res) => res.redirect(301, req.path + '/'));
app.get(['/team/', '/3DVista/team/'], (req, res) => {
    res.sendFile(path.join(vistaPath, 'team', 'index.html'));
});

const staticMiddleware = express.static(vistaPath, staticOptions);

// Mount at both '/3DVista' and root '/' to ensure relative paths NEVER 404
app.use('/3DVista', staticMiddleware);
app.use(staticMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
