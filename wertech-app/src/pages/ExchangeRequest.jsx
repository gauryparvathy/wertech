import { motion } from "framer-motion";
import { MotionButton } from "../components/MotionButton";

export default function BarterRequest() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-10 text-center uppercase tracking-widest text-slate-400">Negotiate Exchange</h2>
      <div className="flex items-center gap-8">
        <div className="flex-1 p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm">
          <h4 className="font-black text-teal-600 mb-4">You Give</h4>
          <textarea className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none outline-none resize-none" placeholder="Describe the skill or item you are offering..." />
        </div>
        <div className="text-4xl">↔️</div>
        <div className="flex-1 p-8 bg-teal-600 text-white rounded-[40px] shadow-xl">
          <h4 className="font-black mb-4 opacity-70">You Receive</h4>
          <div className="h-32 flex items-center justify-center text-center">
            <p className="text-xl font-bold italic">"Industrial Power Drill"</p>
          </div>
        </div>
      </div>
      <div className="mt-10 text-center">
        <MotionButton className="px-20 py-5 text-xl font-black">Submit Proposal</MotionButton>
      </div>
    </div>
  );
}