import React, { useEffect, useState } from "react";
import "./styles.css";
import { Route, Link, Routes, useNavigate, Navigate, useLocation } from "react-router-dom";
import Home from "./Components/Home";
import Perfil from "./Components/Perfil/Perfil";
import Organigrama from "./Components/Organigrama";
import Login from "./Components/Login/Login";
import Empleados from "./Components/Empleados";

// --- COMPONENTE LANDING (Vertical) ---
const MainDashboard = ({ userRole }) => {
  return (
    <div className="vertical-landing fade-in-page">
      <section id="home-section"><Home /></section>
      <section id="organigrama-section"><Organigrama /></section>
      {userRole === 'SUPER_ADMIN' && (
        <section id="empleados-section"><Empleados /></section>
      )}
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Estado para menú móvil
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage = location.pathname === '/Login' || location.pathname === '/';
  const isProfilePage = location.pathname.startsWith('/Perfil/');

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem('user_role');
    
    if (!token) {
      setIsAuthenticated(false);
      if (location.pathname !== '/Login' && location.pathname !== '/') navigate('/Login');
    } else {
      setIsAuthenticated(true);
      setUserRole(role);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setMenuOpen(false);
    navigate('/Login', { replace: true });
  };

  const scrollToSection = (id) => {
    setMenuOpen(false);
    if (isProfilePage) {
      navigate('/Dashboard');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="App">
      <div className="noise-overlay"></div>
      <div className="ambient-glow"></div>

      {!isLoginPage && (
        <header className={`header ${scrolled ? 'scrolled-capsule' : ''} ${menuOpen ? 'menu-is-open' : ''}`}>
          <Link to="/Dashboard" className="logo" onClick={() => setMenuOpen(false)}>Cibercom</Link>
          
          {isAuthenticated && (
            <>
              {/* Botón Hamburguesa */}
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                <span className={menuOpen ? "open" : ""}></span>
              </button>

              <nav className={`navbar ${menuOpen ? 'active' : ''}`}>
                <button onClick={() => scrollToSection('home-section')}>Home</button>
                <button onClick={() => scrollToSection('organigrama-section')}>Organigrama</button>
                {userRole === 'SUPER_ADMIN' && (
                  <button onClick={() => scrollToSection('empleados-section')}>RH / Empleados</button>
                )}
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </nav>
            </>
          )}
        </header>
      )}

      <main className="main-content">
        <Routes location={location} key={location.pathname}>
          <Route path="/Login" element={
            isAuthenticated ? <Navigate to="/Dashboard" replace /> : 
            <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
          } />
          
          <Route path="/Dashboard" element={
            isAuthenticated ? <MainDashboard userRole={userRole} /> : <Navigate to="/Login" />
          }/>

          <Route path="/Perfil/:id" element={
            isAuthenticated ? <Perfil /> : <Navigate to="/Login" />
          } />

          <Route path="*" element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
        </Routes>
      </main>

      {!isLoginPage && (
        <footer className="footer">
          <p>Copyright &copy; 2026 | Cibercom Sistemas</p>
        </footer>
      )}
    </div>
  );
}

export default App;