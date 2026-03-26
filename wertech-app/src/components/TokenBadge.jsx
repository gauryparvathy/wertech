import { motion } from 'framer-motion';

export const TokenBadge = ({ amount, size = "md" }) => (
  <motion.div 
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`inline-flex items-center gap-1 font-bold text-teal-600 bg-teal-50 rounded-full ${
      size === "lg" ? "px-6 py-2 text-xl" : "px-3 py-1 text-sm"
    }`}
  >
    <span>{amount}</span>
    <span className="text-[10px] uppercase tracking-tighter opacity-70">WTK</span>
  </motion.div>
);