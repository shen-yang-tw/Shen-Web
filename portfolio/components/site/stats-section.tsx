'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// const stats = [
//   { value: 15, suffix: '+', label: <>大型專案重構經驗 <span className="block text-xs font-normal text-gray-500 mt-1">Enterprise Projects</span></> },
//   { value: 50, suffix: '+', label: <>數位轉型合作機構 <span className="block text-xs font-normal text-gray-500 mt-1">Client Partners</span></> },
//   { value: 30, suffix: '+', label: <>核心技術與工具鏈 <span className="block text-xs font-normal text-gray-500 mt-1">Tech Stacks</span></> },
//   { value: 99, suffix: '%', label: <>無障礙與效能合規 <span className="block text-xs font-normal text-gray-500 mt-1">Accessibility & Performance</span></> },
// ];
const stats = [
  { value: 15, suffix: '+', label: <>大型專案重構經驗 <span className="block text-xs font-normal text-gray-500 mt-1">Enterprise Projects</span></> },
  { value: 50, suffix: '+', label: <>企業與政府專案經驗 <span className="block text-xs font-normal text-gray-500 mt-1">Client Partners</span></> },
  { value: 2, suffix: '+', label: <>AI 應用核心專案 <span className="block text-xs font-normal text-gray-500 mt-1">AI Application Projects</span></> },
  { value: 99, suffix: '%', label: <>維護擴充性 Web 開發 <span className="block text-xs font-normal text-gray-500 mt-1">Maintain & Scale Development</span></> },
];

function CountUp({ end, suffix }: { end: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [end]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="relative border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-gradient-primary sm:text-5xl">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
