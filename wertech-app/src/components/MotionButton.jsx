import { motion } from "framer-motion";

export const MotionButton = ({ children, onClick, className = "", variant = "primary" }) => {
  const variants = {
    primary: "bg-teal-600 text-white shadow-lg hover:shadow-teal-500/20",
    secondary: "bg-slate-200 text-slate-800 hover:bg-slate-300",
    outline: "border-2 border-teal-600 text-teal-600 hover:bg-teal-50"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, translateY: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-2 rounded-xl font-medium transition-all ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};