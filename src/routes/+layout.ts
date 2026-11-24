// Fully static, client-rendered app: everything is generated in the browser
// and saved to localStorage, so there is no server to talk to.
export const prerender = true;
export const ssr = false;
// Static hosts serve folders as /path/ (index.html inside); matching that
// keeps URLs stable on GitHub Pages and Cloudflare Pages.
export const trailingSlash = 'always';
