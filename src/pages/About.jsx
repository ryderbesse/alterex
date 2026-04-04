import React from 'react';
import { Card } from "@/components/ui/card";
import { Mail, Globe, Youtube, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SnapchatIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.166 3c.112 0 2.062.033 3.056 1.553.357.552.434 1.228.434 1.837V7.29c.285-.1.57-.16.846-.16.498 0 .858.232 1.1.572.194.27.283.593.278.916-.01.58-.308 1.02-.748 1.258.058.107.118.22.17.336.133.298.21.618.21.938 0 1.09-.67 2.01-1.58 2.5-.045.72-.23 1.47-.643 2.08-.426.63-1.08 1.08-1.89 1.29l.17.87c.07.35.3.55.6.55.17 0 .35-.04.52-.08.28-.07.58-.16.89-.16.52 0 1.09.24 1.34.86.09.22.13.45.13.68 0 .58-.31 1.06-.85 1.3-.42.18-.96.26-1.5.34-.28.04-.56.09-.83.15-.18.04-.34.11-.47.22-.25.2-.41.52-.61.87-.23.41-.53.87-1.02.87-.22 0-.43-.07-.66-.15-.43-.16-.87-.38-1.58-.38-.71 0-1.15.22-1.58.38-.23.08-.44.15-.66.15-.49 0-.79-.46-1.02-.87-.2-.35-.36-.67-.61-.87-.13-.11-.29-.18-.47-.22-.27-.06-.55-.11-.83-.15-.54-.08-1.08-.16-1.5-.34-.54-.24-.85-.72-.85-1.3 0-.23.04-.46.13-.68.25-.62.82-.86 1.34-.86.31 0 .61.09.89.16.17.04.35.08.52.08.3 0 .53-.2.6-.55l.17-.87c-.81-.21-1.46-.66-1.89-1.29-.413-.61-.598-1.36-.643-2.08C5.67 11.91 5 10.99 5 9.9c0-.32.077-.64.21-.938.052-.116.112-.229.17-.336-.44-.238-.738-.678-.748-1.258-.005-.323.084-.646.278-.916.242-.34.602-.572 1.1-.572.276 0 .561.06.846.16V6.39c0-.609.077-1.285.434-1.837C8.804 3.033 10.054 3 10.166 3h2z"/>
  </svg>
);

const founders = [
  {
    name: "Ryder Besse",
    photo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/e5910fb11_Screenshot2025-12-08at111955AM.png",
    bio: "Ryder has always embraced adventure and innovative thinking. With extensive business training through AI internships, personal investments, and summer programs, he has pursued learning at every opportunity. Born in Colorado, moving to Mexico to learn Spanish, and now attending Lawrenceville Boarding School with a 4.00 GPA, he recognized that everyone learns differently. This inspired him to create Alterex, a platform designed to tailor learning to each individual depending on their personalized learning style or ability.",
    email: "ryderbesse@gmail.com",
  },
  {
    name: "Avi Draksharam",
    photo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/1adf8c015_WhatsAppImage2026-02-17at213817.jpg",
    bio: "Avi is an experienced young entrepreneur with a background in AI internships and building a successful sneaker resale business in high school. Driven by his own learning challenges, he aims to improve the broken form of education in place. Through Alterex, Avi's mission is to ensure every student, regardless of learning differences, has an equal opportunity to succeed and reach their full potential.",
    email: "avidraksharam@gmail.com",
  }
];

const socials = [
  {
    name: "YouTube",
    icon: Youtube,
    handle: "@Alterexai",
    url: "https://www.youtube.com/@Alterexai",
    metrics: [
      { label: "Subscribers", goal: 100, current: 8 },
      { label: "Views", goal: 25000, current: 10300 },
    ],
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-100 dark:border-red-800",
    barColor: "bg-red-400"
  },
  {
    name: "Snapchat",
    icon: SnapchatIcon,
    handle: "@alterex.ai",
    url: "https://www.snapchat.com/@alterex.ai",
    metrics: [
      { label: "Followers", goal: 100, current: 0 },
      { label: "Views", goal: 25000, current: 0 },
    ],
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-100 dark:border-yellow-800",
    barColor: "bg-yellow-400"
  }
];

export default function About() {
  const { data: userCountData } = useQuery({
    queryKey: ['userCount'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserCount', {});
      return res.data.count;
    },
  });

  const userCount = userCountData || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/20 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl('Settings')} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png"
              alt="Alterex Logo"
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-3">About Alterex</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            The purpose of this app is to personalize the learning environment to fit your needs, no matter your learning type or ability.
          </p>
        </motion.div>

        {/* Founders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <h2 className="text-xl font-bold mb-5 text-center">Meet the Founders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {founders.map((founder, i) => (
              <Card key={i} className="p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-24 h-24 rounded-full border-4 border-violet-100 dark:border-violet-900 mb-4 overflow-hidden flex-shrink-0">
                  <img
                    src={founder.photo}
                    alt={founder.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: i === 1 ? 'top' : 'center' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(founder.name)}&background=7c3aed&color=fff&size=96`;
                    }}
                  />
                </div>
                <h3 className="font-bold text-lg mb-2">{founder.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{founder.bio}</p>
                <a
                  href={`mailto:${founder.email}`}
                  className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {founder.email}
                </a>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <Card className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Get in Touch</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">We'd love to hear your feedback, ideas, or questions.</p>
            <div className="flex flex-col items-center gap-3">
              <a href="mailto:alterexai@gmail.com" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors">
                <Mail className="w-4 h-4" />
                alterexai@gmail.com
              </a>

            </div>
          </Card>
        </motion.div>

        {/* Social Media */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
          <h2 className="text-xl font-bold mb-2 text-center">Follow Our Journey</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">We're building something special — follow along and help us grow!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socials.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
                <Card className={`p-4 border ${s.border} ${s.bg} hover:shadow-md transition-all`}>
                  <div className="flex items-center gap-3 mb-3">
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.handle}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {s.metrics.map((m, j) => {
                      const progress = Math.min((m.current / m.goal) * 100, 100);
                      return (
                        <div key={j}>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{m.label} Goal: {m.goal.toLocaleString()}</span>
                            <span>{m.current.toLocaleString()}/{m.goal.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${s.barColor}`}
                              style={{ width: `${Math.max(progress, 3)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </motion.div>

        {/* User Count */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 text-center bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <p className="text-sm font-medium opacity-80 mb-1">Current Users</p>
            <p className="text-5xl font-bold mb-4">{userCount > 0 ? userCount : '—'}</p>
            <p className="text-sm opacity-90 leading-relaxed max-w-sm mx-auto">
              We're just getting started, and every user means the world to us. If you're enjoying Alterex, please consider sharing it with your friends and helping us grow our community.
            </p>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}