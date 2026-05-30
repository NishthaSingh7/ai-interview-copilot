const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer shrink-0">
      <p className="site-footer-text">
        © {year} <span className="font-medium">Nishtha Singh</span>. All rights reserved.
      </p>
      <p className="site-footer-sub">AI Interview Copilot</p>
    </footer>
  );
};

export default Footer;
