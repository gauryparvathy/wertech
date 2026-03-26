import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, Repeat, Bell, User, Shield, BarChart2 } from 'lucide-react';
import BrandLogo from './BrandLogo';

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link to={to}>
    <motion.div 
      whileHover={{ x: 5, backgroundColor: 'rgba(13, 148, 136, 0.1)' }}
      className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${
        active ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-teal-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </motion.div>
  </Link>
);

export default function Layout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r p-6 fixed h-full z-10">
        <BrandLogo size={32} textClassName="text-2xl mb-10" />
        <nav>
          <NavItem to="/dashboard" icon={Home} label="Dashboard" active={pathname === '/dashboard'} />
          <NavItem to="/explore" icon={Search} label="Explore" active={pathname === '/explore'} />
          <NavItem to="/ledger" icon={Repeat} label="Skill Ledger" active={pathname === '/ledger'} />
          <NavItem to="/notifications" icon={Bell} label="Notifications" active={pathname === '/notifications'} />
          <NavItem to="/profile" icon={User} label="Profile" active={pathname === '/profile'} />
          <div className="mt-8 pt-8 border-t border-slate-100">
            <NavItem to="/admin" icon={Shield} label="Admin" active={pathname === '/admin'} />
            <NavItem to="/analytics" icon={BarChart2} label="Analytics" active={pathname === '/analytics'} />
          </div>
        </nav>
      </aside>
      <main className="ml-64 flex-1 p-10">{children}</main>
    </div>
  );
}
