import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Coins,
  ShieldCheck,
  Repeat,
  BarChart3,
  Clock3,
  Mail,
  MapPin
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = String(params.get('ref') || '').trim();
    if (ref) {
      localStorage.setItem('wertech_referrer', ref);
    }
  }, [location.search]);

  const goToLogin = () => navigate('/login');
  const goToRegister = () => navigate(location.search ? `/register${location.search}` : '/register');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-8 md:py-12">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-30 flex items-center justify-between"
        >
          <BrandLogo size={42} textClassName="text-4xl md:text-5xl" />
          <button
            onClick={goToLogin}
            className="px-6 py-3 rounded-2xl app-btn-primary border border-white/20 font-black text-white transition-all"
          >
            Sign In
          </button>
        </motion.header>

        <section className="relative pt-14 md:pt-20 pb-16 md:pb-20">
          <div className="pointer-events-none absolute -top-16 -right-20 w-72 h-72 bg-teal-100 rounded-full blur-3xl opacity-70" />
          <div className="pointer-events-none absolute top-24 -left-16 w-56 h-56 bg-cyan-100 rounded-full blur-3xl opacity-60" />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative max-w-3xl"
          >
            <p className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-100 px-4 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-wider">
              Community Barter Platform
            </p>
            <h2 className="mt-6 text-5xl md:text-7xl leading-[1.02] font-black tracking-tight text-slate-900">
              Trade skills.
              <br />
              Exchange value.
              <br />
              Grow together.
            </h2>
            <p className="mt-6 text-lg md:text-xl text-slate-500 font-medium max-w-2xl">
              Wertech helps local communities swap goods and services with trust, transparency, and tokenized value.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={goToRegister}
              className="px-8 py-4 rounded-2xl app-btn-primary text-white font-black text-lg transition-all active:scale-95 inline-flex items-center gap-2"
              >
                Create Account <ArrowRight size={20} />
              </button>
              <button
                onClick={goToLogin}
                className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:border-teal-500 hover:text-teal-700 transition-all"
              >
                Explore Portal
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="relative mt-14 grid grid-cols-1 md:grid-cols-3 gap-5"
          >
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6"
        >
          <InsightCard
            icon={<Repeat size={18} />}
            title="AI Assisted Matching"
            text="Smart suggestions help users find relevant barter partners faster."
          />
          <InsightCard
            icon={<BarChart3 size={18} />}
            title="Live Community Pulse"
            text="Real-time activity highlights what services are trending nearby."
          />
          <InsightCard
            icon={<Clock3 size={18} />}
            title="Fast Deal Cycles"
            text="Most exchanges are initiated, accepted, and completed in under 24 hours."
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="bg-white border border-slate-200 rounded-[36px] p-7 md:p-10 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <Feature
              icon={<Repeat size={20} />}
              title="Smart Matching"
              text="Connect with nearby users who need what you offer."
            />
            <Feature
              icon={<ShieldCheck size={20} />}
              title="Moderated Exchange"
              text="Built-in verification and reporting keep trades secure."
            />
            <Feature
              icon={<Coins size={20} />}
              title="WTK Wallet"
              text="Track your barter balance and transaction history easily."
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-6 bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 rounded-[36px] p-8 md:p-10 text-white shadow-xl shadow-cyan-500/20"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-teal-100">Start Your First Exchange</p>
              <h3 className="text-3xl md:text-4xl font-black mt-2">Build your local barter profile in minutes.</h3>
              <p className="mt-3 text-teal-50/90 font-medium">List skills, add services, and connect with trusted members nearby.</p>
            </div>
            <button
              onClick={goToRegister}
              className="px-7 py-4 rounded-2xl bg-white text-cyan-700 font-black hover:bg-slate-100 transition-all inline-flex items-center gap-2 self-start md:self-center"
            >
              Join Wertech <ArrowRight size={18} />
            </button>
          </div>
        </motion.section>

        <footer className="mt-8 mb-3 bg-white border border-slate-200 rounded-[36px] p-7 md:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <BrandLogo size={34} textClassName="text-3xl" />
              <p className="mt-3 text-slate-500 font-medium">
                Trusted community barter platform for real value exchange.
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Platform</p>
              <ul className="space-y-2 text-slate-600 font-medium">
                <li>Explore Listings</li>
                <li>User Profiles</li>
                <li>Moderation</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Company</p>
              <ul className="space-y-2 text-slate-600 font-medium">
                <li>About Wertech</li>
                <li>Community Guidelines</li>
                <li>Security & Privacy</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Contact</p>
              <div className="space-y-3 text-slate-600 font-medium">
                <p className="flex items-center gap-2"><Mail size={16} className="text-teal-600" /> support@wertech.io</p>
                <p className="flex items-center gap-2"><MapPin size={16} className="text-teal-600" /> Community-first, Remote</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-sm text-slate-500 font-medium">
            <p>(c) {new Date().getFullYear()} Wertech Technologies. All rights reserved.</p>
            <p>Built for trusted local exchange networks.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FloatingCardWrapper({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55 }}
      className={`bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-lg transition-all ${className}`}
      whileHover={{ y: -6 }}
    >
      {children}
    </motion.div>
  );
}

function InsightCard({ icon, title, text }) {
  return (
    <FloatingCardWrapper className="relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-teal-100 rounded-full blur-2xl opacity-60" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">{icon}</div>
        <h4 className="mt-4 text-xl font-black text-slate-900">{title}</h4>
        <p className="mt-2 text-slate-500 font-medium">{text}</p>
      </div>
    </FloatingCardWrapper>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-black text-slate-900">{title}</h4>
        <p className="text-slate-500 font-medium">{text}</p>
      </div>
    </div>
  );
}
