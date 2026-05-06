import React, { useState, useEffect } from 'react';
import { Home, Target, MapPin, TrendingUp, User, ChevronLeft, Info, Activity, Layers, Crosshair, Zap, MousePointerClick, ShieldCheck, Flame, Trophy, PlayCircle, Star, Navigation, Heart, Plus, Users, Search, X, Image as ImageIcon, Bell, Award, Medal, CalendarSync, LogOut, LogIn, Edit2 } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}



// --- Custom SVGs for Line-Art Icons ---

const HandIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M40 85 V75 C40 68 50 65 50 65 C50 65 58 60 55 50 C52 40 45 40 40 45 C35 50 25 65 25 75 C25 80 28 85 28 85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="65" cy="35" r="15" stroke="currentColor" strokeWidth="4"/>
    <path d="M55 25 L75 45 M75 25 L55 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <path d="M35 30 L40 25 M30 40 L25 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const BallPulseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="4"/>
    <path d="M35 35 L65 65 M65 35 L35 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <path d="M25 50 A20 20 0 0 1 75 50" stroke="currentColor" strokeWidth="4"/>
    <path d="M25 40 L15 30 M25 60 L15 70" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const BallPassIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="65" cy="50" r="20" stroke="currentColor" strokeWidth="4"/>
    <path d="M50 40 L80 60 M80 40 L50 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <path d="M15 50 L35 50 M25 40 L35 50 L25 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M45 50 Q 55 65 65 50" stroke="currentColor" strokeWidth="4"/>
  </svg>
);

// --- Shared Components ---

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'treinos', label: 'Treinos', icon: Target },
    { id: 'quadras', label: 'Quadras', icon: MapPin },
    { id: 'progresso', label: 'Progresso', icon: TrendingUp },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 pb-8 flex justify-between items-center z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors group",
              isActive ? "" : "opacity-30"
            )}
          >
            <Icon strokeWidth={2.5} size={24} className={isActive ? "text-[#1E5EFF]" : "text-black"} />
            <span className={cn("text-[10px] font-bold mt-1", isActive ? "text-[#1E5EFF]" : "text-slate-900")}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// --- Screens ---

const InicioScreen = ({ 
  onStartWorkout, 
  streak, 
  weeklyProgress,
  userLevel,
  suggestedFocus,
  userName,
  onUpdateUserName
}: { 
  onStartWorkout: () => void, 
  streak: number, 
  weeklyProgress: number,
  userLevel: string,
  suggestedFocus: string,
  userName: string,
  onUpdateUserName: (name: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSave = () => {
    if (tempName.trim()) {
      onUpdateUserName(tempName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="p-6 pt-12 h-full flex flex-col overflow-y-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Bem-vindo(a) de volta,</p>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
                className="text-2xl font-black text-slate-900 tracking-tighter bg-slate-50 border-b-2 border-[#1E5EFF] focus:outline-none w-48"
              />
            ) : (
              <>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{userName}</h1>
                <button onClick={() => setIsEditing(true)} aria-label="Editar nome" className="text-slate-300 hover:text-[#1E5EFF] transition-colors mt-1 rounded-full p-1">
                  <Edit2 size={16} strokeWidth={3} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 text-slate-600">
          <User size={24} strokeWidth={2.5} />
        </div>
      </div>

      {streak === 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-rose-50 border border-rose-100 rounded-[1.5rem] p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-500">
            <CalendarSync size={20} strokeWidth={2.5} />
          </div>
          <div className="pt-0.5">
            <h4 className="text-sm font-black text-slate-900 tracking-tight">Cuidado com o ritmo!</h4>
            <p className="text-xs text-rose-600 font-medium leading-tight mt-1">Você está há 2 dias sem treinar. Vamos voltar à quadra e recuperar sua sequência?</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between h-28">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sequência</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-[#1E5EFF] leading-none">{streak}</span>
            <Flame size={24} className={cn("ml-1 mb-1", streak > 0 ? "text-[#1E5EFF] fill-[#1E5EFF]" : "text-slate-300 fill-slate-300")} strokeWidth={2.5} />
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between h-28">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Esta Semana</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-slate-900 leading-none">{weeklyProgress}</span>
            <span className="text-xl font-black text-slate-400 mb-0.5">/5</span>
          </div>
        </div>
      </div>

    <div className="mb-8">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase">Treino Adaptável do Dia</h2>
        <div className="flex items-center gap-1 text-[#1E5EFF]">
           <Zap size={14} className="fill-[#1E5EFF]" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Inteligente</span>
        </div>
      </div>
      <div className="bg-[#1E5EFF] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-lg shadow-blue-200">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <span className="text-[10px] font-bold tracking-widest uppercase">{suggestedFocus}</span>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <span className="text-[10px] font-bold tracking-widest uppercase">{userLevel}</span>
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tighter leading-none mb-2">Fundamentos<br/>de {suggestedFocus}</h3>
          <p className="text-sm font-medium opacity-90 mb-6">Nível adaptado ao seu desempenho recente</p>
          <button 
            onClick={onStartWorkout}
            className="w-full bg-white text-[#1E5EFF] px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors"
          >
            Começar Treino
          </button>
        </div>
        <HandIcon className="absolute -right-4 -bottom-4 w-48 h-48 opacity-10" />
      </div>
    </div>

    <div>
      <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">Recomendado pelo Histórico</h2>
      <div className="bg-white border-2 border-slate-100 p-4 rounded-[1.5rem] flex items-center gap-4">
         <div className="w-14 h-14 rounded-[1rem] bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
           <Activity size={24} strokeWidth={2.5} />
         </div>
         <div className="flex-1">
           <h3 className="text-sm font-black text-slate-900 tracking-tighter">Exercícios de Drible</h3>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Você tem focado em arremesso</p>
         </div>
         <button aria-label="Adicionar Exercícios de Drible" className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200">
           <PlayCircle size={20} strokeWidth={2.5} />
         </button>
      </div>
    </div>
  </div>
  );
};

interface Court {
  id: string;
  name: string;
  distance: string;
  rating: number;
  address: string;
  crowd: 'Leve' | 'Médio' | 'Cheio';
  lat: number;
  lng: number;
  img: string;
}

const mockCourts: Court[] = [
  { id: '1', name: 'Parque Ibirapuera', distance: '1.2 km', rating: 4.8, address: 'Av. Pedro Álvares Cabral - Vila Mariana', crowd: 'Cheio', lat: -23.5874, lng: -46.6576, img: 'https://images.unsplash.com/photo-1542652694-40abf526446e?auto=format&fit=crop&q=80&w=600&h=400' },
  { id: '2', name: 'Sesc Pinheiros', distance: '3.5 km', rating: 4.5, address: 'R. Pais Leme, 195 - Pinheiros', crowd: 'Médio', lat: -23.5682, lng: -46.6975, img: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=600&h=400' },
  { id: '3', name: 'Praça Roosevelt', distance: '5.0 km', rating: 4.2, address: 'Praça Franklin Roosevelt - Consolação', crowd: 'Leve', lat: -23.5484, lng: -46.6477, img: 'https://images.unsplash.com/photo-1511067007302-3f14652431cb?auto=format&fit=crop&q=80&w=600&h=400' },
];

const AbstractMapPattern = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <rect width="100%" height="100%" fill="#F8FAFC" />
    <path d="M-50 150 Q 80 150 150 250 T 500 100" fill="none" stroke="#E2E8F0" strokeWidth="16" strokeLinecap="round" />
    <path d="M 100 -50 Q 100 150 250 100 T 500 250" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />
    <path d="M 280 -50 V 400" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeDasharray="12 12" />
    <path d="M -50 50 Q 200 50 400 -50" fill="none" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const CustomMapPin = ({ active }: { active?: boolean }) => (
  <div className={cn(
    "relative flex items-center justify-center w-10 h-10 rounded-xl shadow-lg border-2 transition-transform",
    active ? "bg-[#1E5EFF] border-white text-white scale-110 z-20" : "bg-white border-[#1E5EFF] text-[#1E5EFF] scale-100 z-10 hover:scale-105"
  )}>
    <BallPulseIcon className="w-6 h-6" />
    <div className={cn(
      "absolute -bottom-1.5 w-3 h-3 rotate-45 border-r-2 border-b-2",
      active ? "bg-[#1E5EFF] border-white" : "bg-white border-[#1E5EFF]"
    )} />
  </div>
);

const CourtDetailsScreen = ({ court, onClose }: { court: Court, onClose: () => void }) => {
  const crowdConfig = {
    'Leve': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: Users },
    'Médio': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Users },
    'Cheio': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: Users },
  }[court.crowd];

  const CrowdIcon = crowdConfig.icon;

  return (
    <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute inset-0 bg-white z-[60] flex flex-col">
      <div className="h-[40%] relative w-full bg-slate-200 flex-shrink-0">
        <img src={court.img} alt={court.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        <button onClick={onClose} aria-label="Voltar" className="absolute top-12 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-colors">
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <button aria-label="Favoritar Quadra" className="absolute top-12 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-colors">
          <Heart size={20} strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex-1 bg-white rounded-t-[2.5rem] -mt-8 relative z-10 p-6 flex flex-col overflow-y-auto">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{court.name}</h1>
          <div className="flex items-center gap-1 bg-[#1E5EFF] text-white px-2 py-1 rounded-lg">
            <Star size={12} className="fill-white" />
            <span className="text-[10px] font-black">{court.rating}</span>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 mb-6">{court.address}</p>

        <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center gap-1">
            <Navigation size={20} className="text-slate-400" strokeWidth={2.5} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">Distância</span>
            <span className="text-xl font-black text-slate-900 leading-none">{court.distance}</span>
          </div>
          <div className={cn("flex-1 border rounded-3xl p-4 flex flex-col items-center justify-center gap-1", crowdConfig.bg, crowdConfig.border)}>
            <CrowdIcon size={20} className={crowdConfig.color} strokeWidth={2.5} />
            <span className={cn("text-[10px] uppercase tracking-widest font-bold mt-1", crowdConfig.color)}>Movimento</span>
            <span className={cn("text-xl font-black leading-none", crowdConfig.color)}>{court.crowd}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button className="w-full bg-[#1E5EFF] text-white font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs">
            <Navigation size={18} strokeWidth={2.5} />
            Como Chegar
          </button>
          <button className="w-full bg-slate-50 text-slate-900 border-2 border-slate-200 font-bold py-4 rounded-2xl shadow-sm hover:bg-slate-100 transition-colors uppercase tracking-widest text-xs">
            Salvar como Favorita
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const AddCourtScreen = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 bg-white z-[60] flex flex-col pt-12 px-6 pb-12">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Nova Quadra</h1>
        <button onClick={onClose} aria-label="Fechar" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
          <X size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col gap-5">
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nome do Local</label>
          <input type="text" placeholder="Ex: Parque Ibirapuera" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] px-4 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#1E5EFF] transition-colors placeholder:font-medium placeholder:text-slate-400" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Endereço</label>
          <input type="text" placeholder="Rua, número, bairro" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] px-4 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#1E5EFF] transition-colors placeholder:font-medium placeholder:text-slate-400" />
        </div>

        <div className="space-y-2 mt-2">
           <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Foto do Local</label>
           <button className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#1E5EFF] hover:border-[#1E5EFF] hover:bg-blue-50 transition-all">
              <ImageIcon size={28} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Adicionar Foto</span>
           </button>
        </div>
      </div>

      <button onClick={onClose} className="w-full bg-[#1E5EFF] text-white font-bold py-4 rounded-2xl shadow-sm mt-6 uppercase tracking-widest text-xs hover:bg-blue-700 transition-colors">
        Adicionar Quadra
      </button>
    </motion.div>
  );
};

const QuadrasScreen = () => {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activePin, setActivePin] = useState<string | null>('1');

  // Custom leafet icon creation using ReactDOMServer is generally needed for complex SVGs, 
  // but we can also use basic divIcons for tailwind.
  const createMapIcon = (isActive: boolean) => L.divIcon({
    className: 'bg-transparent border-none shadow-none',
    html: `<div class="relative flex items-center justify-center w-10 h-10 rounded-xl shadow-lg border-2 transition-transform ${isActive ? 'bg-[#1E5EFF] border-white text-white scale-110 z-20' : 'bg-white border-[#1E5EFF] text-[#1E5EFF] scale-100 z-10 hover:scale-105'}">
            <svg viewBox="0 0 100 100" fill="none" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="25" stroke="currentColor" stroke-width="4"/>
                <path d="M35 35 L65 65 M65 35 L35 65" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
                <path d="M25 50 A20 20 0 0 1 75 50" stroke="currentColor" stroke-width="4"/>
                <path d="M25 40 L15 30 M25 60 L15 70" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            <div class="absolute -bottom-1.5 w-3 h-3 rotate-45 border-r-2 border-b-2 ${isActive ? 'bg-[#1E5EFF] border-white' : 'bg-white border-[#1E5EFF]'}"></div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  return (
    <div className="relative h-full w-full bg-white flex flex-col">
      {/* Map Top Half */}
      <div className="relative h-[40%] bg-[#F8FAFC] border-b border-slate-100 overflow-hidden flex-shrink-0 z-0">
        <MapContainer center={[-23.5505, -46.6333]} zoom={11} zoomControl={false} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {mockCourts.map(court => (
            <Marker 
              key={court.id}
              position={[court.lat, court.lng]}
              icon={createMapIcon(activePin === court.id)}
              eventHandlers={{
                click: () => {
                  setActivePin(court.id);
                  setSelectedCourt(court);
                }
              }}
            >
              <Popup className="font-sans font-bold text-slate-800">
                {court.name}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* List Bottom Half */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24 bg-white relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Quadras</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Quadras próximas a você</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)} 
            aria-label="Adicionar quadra"
            className="w-12 h-12 bg-[#1E5EFF] text-white rounded-[1rem] flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 transition-transform"
          >
             <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {mockCourts.map(court => (
            <div 
              key={court.id} 
              onClick={() => { setActivePin(court.id); setSelectedCourt(court); }} 
              className={cn(
                "bg-white border-2 p-3 rounded-[1.5rem] flex items-center gap-4 transition-colors cursor-pointer", 
                activePin === court.id ? "border-[#1E5EFF]" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 relative">
                <img src={court.img} alt={court.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-black tracking-tighter text-slate-900 leading-none truncate pr-2">{court.name}</h3>
                  <div className="flex items-center gap-0.5 text-[#1E5EFF] flex-shrink-0">
                    <Star size={10} className="fill-[#1E5EFF]" />
                    <span className="text-[10px] font-black">{court.rating}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate mb-2">{court.address}</p>
                <div className="flex gap-2">
                   <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{court.distance}</span>
                   <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md", 
                     court.crowd === 'Leve' ? 'text-emerald-600 bg-emerald-50' : 
                     court.crowd === 'Médio' ? 'text-amber-600 bg-amber-50' : 
                     'text-rose-600 bg-rose-50'
                   )}>
                     {court.crowd}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedCourt && <CourtDetailsScreen court={selectedCourt} onClose={() => setSelectedCourt(null)} />}
        {isAdding && <AddCourtScreen onClose={() => setIsAdding(false)} />}
      </AnimatePresence>
    </div>
  );
};

const ProgressoScreen = () => {
  const badges = [
    { id: 1, name: 'Primeiro Passo', desc: 'Concluiu o 1º treino', icon: Trophy, unlocked: true },
    { id: 2, name: 'Em Chamas', desc: '3 dias de sequência', icon: Flame, unlocked: true },
    { id: 3, name: 'Sniper', desc: '80% acerto em arremessos', icon: Target, unlocked: false },
    { id: 4, name: 'Avançado', desc: 'Atingiu o nível máximo', icon: Star, unlocked: false },
  ];

  return (
    <div className="p-6 pt-16 h-full flex flex-col bg-slate-50 overflow-y-auto pb-24">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">Conquistas</h1>
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Seu histórico de glórias</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center shadow-sm">
           <div className="w-12 h-12 bg-blue-50 text-[#1E5EFF] rounded-full flex items-center justify-center mb-3">
              <Award size={24} strokeWidth={2.5} />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">12</h3>
           <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Treinos Concluídos</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center shadow-sm">
           <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
              <Medal size={24} strokeWidth={2.5} />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">Drible</h3>
           <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Melhor Fundamento</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">Suas Medalhas</h2>
        <div className="grid grid-cols-2 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className={cn(
              "rounded-[1.5rem] p-4 flex flex-col items-center text-center border-2 transition-all",
              badge.unlocked 
                ? "bg-white border-[#1E5EFF] shadow-sm transform hover:-translate-y-1" 
                : "bg-slate-100 border-slate-200 opacity-60 grayscale"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center mb-3",
                badge.unlocked ? "bg-blue-50 text-[#1E5EFF]" : "bg-slate-200 text-slate-400"
              )}>
                <badge.icon size={28} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight mb-1">{badge.name}</h4>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerfilScreen = () => {
  const [user, loading, error] = useAuthState(auth);

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => {
    signOut(auth);
  };

  return (
    <div className="p-6 pt-16 h-full flex flex-col bg-slate-50 overflow-y-auto pb-24">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">Perfil</h1>
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Sua conta e dados</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Activity className="animate-spin text-[#1E5EFF]" size={32} />
        </div>
      ) : user ? (
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] p-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden mb-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Foto de Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={48} />
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter text-center leading-none">{user.displayName || 'Jogador'}</h2>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">{user.email}</p>
          </div>

          <button onClick={logout} className="w-full bg-white text-rose-500 font-bold py-4 rounded-2xl shadow-sm border-2 border-rose-50 flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors uppercase tracking-widest text-xs">
            <LogOut size={18} strokeWidth={2.5} />
            Sair da Conta
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-blue-50 text-[#1E5EFF] rounded-[2rem] flex items-center justify-center mb-6">
            <User size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Entre para Salvar</h2>
          <p className="text-sm font-medium text-slate-500 mb-8 max-w-[250px]">Faça login para salvar seus treinos, quadras favoritas e acompanhar seu progresso em qualquer dispositivo.</p>
          
          <button onClick={login} className="w-full bg-[#1E5EFF] text-white font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs">
            <LogIn size={18} strokeWidth={2.5} />
            Entrar com Google
          </button>
        </div>
      )}
    </div>
  );
};

interface TrainingCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  stats: { label: string; value: string | number; suffix?: string; isHighlight?: boolean }[];
  level: { current: string; percentage: number };
  sections: { id: string; title: string; subtitle: string; icon: React.ElementType }[];
}

const dataArremesso: TrainingCategory = {
  id: 'arremesso',
  title: 'Arremesso',
  subtitle: 'Precisão e consistência',
  icon: HandIcon,
  stats: [
    { label: '% de acerto', value: 72, suffix: '%' },
    { label: 'arremessos', value: 145 },
    { label: 'dias seguidos', value: 12, isHighlight: true },
  ],
  level: { current: 'Intermediário', percentage: 65 },
  sections: [
    { id: '1', title: '1. Mecânica', subtitle: 'Aperfeiçoe sua forma', icon: Layers },
    { id: '2', title: '2. Arremesso parado', subtitle: 'Lances de spot e lance livre', icon: Crosshair },
    { id: '3', title: '3. Arremesso em movimento', subtitle: 'Catch and shoot e saindo do drible', icon: Zap },
    { id: '4', title: '4. Situação de jogo', subtitle: 'Contestados, step back e pull-up', icon: Activity },
  ]
};

const dataDrible: TrainingCategory = {
  id: 'drible',
  title: 'Drible',
  subtitle: 'Controle e domínio',
  icon: BallPulseIcon,
  stats: [
    { label: 'controle', value: 84, suffix: '%' },
    { label: 'sequências', value: 98 },
    { label: 'dias seguidos', value: 15, isHighlight: true },
  ],
  level: { current: 'Intermediário', percentage: 70 },
  sections: [
    { id: '1', title: '1. Controle básico', subtitle: 'Fundamentos do drible', icon: MousePointerClick },
    { id: '2', title: '2. Velocidade', subtitle: 'Drible em alta intensidade', icon: Zap },
    { id: '3', title: '3. Moves (jogadas)', subtitle: 'Crossover, entre as pernas e mais', icon: Layers },
    { id: '4', title: '4. Pressão de jogo', subtitle: 'Drible com marcação e proteção', icon: ShieldCheck },
  ]
};

const dataPasse: TrainingCategory = {
  id: 'passe',
  title: 'Passe',
  subtitle: 'Visão e precisão',
  icon: BallPassIcon,
  stats: [
    { label: '% de acerto', value: 78, suffix: '%' },
    { label: 'passes certos', value: 132 },
    { label: 'dias seguidos', value: 10, isHighlight: true },
  ],
  level: { current: 'Intermediário', percentage: 60 },
  sections: [
    { id: '1', title: '1. Fundamentos', subtitle: 'Passe de peito, quicado e por cima', icon: Layers },
    { id: '2', title: '2. Precisão', subtitle: 'Alvos fixos e em movimento', icon: Crosshair },
    { id: '3', title: '3. Velocidade de decisão', subtitle: 'Passe rápido e reação', icon: Zap },
    { id: '4', title: '4. Situação real', subtitle: 'Contra-ataque e passe sob pressão', icon: Activity },
  ]
};


const TrainingDetailsScreen = ({ data, onBack }: { key?: string, data: TrainingCategory, onBack: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-white z-40 flex flex-col pt-12 pb-24 overflow-y-auto"
    >
      {/* Header */}
      <header className="px-6 flex items-start justify-between mb-8 relative">
        <div className="flex flex-col z-10 w-2/3">
          <button onClick={onBack} aria-label="Voltar" className="p-2 -ml-2 mb-2 text-slate-900 hover:bg-slate-100 rounded-full transition-colors w-fit">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-4xl font-black tracking-tighter leading-none text-slate-900 mb-2">{data.title}</h1>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{data.subtitle}</p>
        </div>
        <div className="absolute right-6 top-0 flex flex-col items-end">
          <button aria-label="Informações" className="text-[#1E5EFF] p-2 hover:bg-blue-50 rounded-full transition-colors">
            <Info size={24} strokeWidth={2.5} />
          </button>
          <div className="text-[#1E5EFF] mt-2 pr-2">
            <data.icon className="w-24 h-24 opacity-20" />
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 mb-8 mt-2">
        <h3 className="text-[10px] font-bold text-slate-400 tracking-widest mb-4 uppercase">Estatísticas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{data.stats[0]?.label}</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-slate-900 leading-none">{data.stats[0]?.value}</span>
              {data.stats[0]?.suffix && <span className="text-xl font-black text-slate-900 mb-0.5">{data.stats[0]?.suffix}</span>}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{data.stats[2]?.label}</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-[#1E5EFF] leading-none">{data.stats[2]?.value}</span>
              {data.stats[2]?.isHighlight && <Flame size={20} className="text-[#1E5EFF] ml-1 mb-0.5 fill-[#1E5EFF]" strokeWidth={2.5}/>}
            </div>
          </div>
        </div>
      </div>

      {/* Level */}
      <div className="px-6 mb-10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Nível</span>
          <span className="text-[10px] font-bold text-[#1E5EFF] tracking-widest uppercase">{data.level.current} — {data.level.percentage}%</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.level.percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#1E5EFF] rounded-full"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-6">
        <h3 className="text-[10px] font-bold text-slate-400 tracking-widest mb-4 uppercase">Etapas</h3>
        <div className="flex flex-col gap-3">
          {data.sections.map((section) => (
            <button key={section.id} className="flex items-center gap-4 group text-left bg-white border border-slate-100 p-3 rounded-2xl shadow-sm hover:border-slate-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-[#1E5EFF] group-hover:text-white transition-colors flex-shrink-0">
                <section.icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{section.title}</h4>
                <p className="text-xs font-medium text-slate-500">{section.subtitle}</p>
              </div>
              <ChevronLeft size={20} className="text-slate-300 rotate-180 group-hover:text-slate-600 transition-colors" strokeWidth={2.5} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};


// --- Workout Screens ---

const WorkoutScreen = ({ focus, onFinish, onCancel }: { key?: string, focus: string, onFinish: (timeElapsed: number) => void, onCancel: () => void }) => {
  const INITIAL_TIME = 15 * 60;
  const [secondsLeft, setSecondsLeft] = React.useState(INITIAL_TIME);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          onFinish(INITIAL_TIME);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPaused, secondsLeft, onFinish, INITIAL_TIME]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute inset-0 bg-slate-900 z-[60] flex flex-col justify-between pt-16 px-6 pb-12 text-white"
    >
      <div className={cn("absolute inset-0 bg-black/50 pointer-events-none transition-opacity duration-500", isPaused ? "opacity-100 ease-in" : "opacity-0 ease-out z-[-1]")}></div>
      <div className="flex justify-between items-center w-full relative z-20">
         <button onClick={onCancel} aria-label="Voltar" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={28} strokeWidth={2.5} />
         </button>
         <div className="flex items-center gap-2">
            <Activity className="text-[#1E5EFF]" size={20} />
            <span className="text-xs font-bold tracking-widest uppercase text-slate-400">{isPaused ? 'Pausado' : 'Em Execução'}</span>
         </div>
         <div className="w-10"></div>
      </div>

      <div className="flex flex-col items-center flex-1 justify-center relative z-20">
         <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
           {!isPaused && <div className="w-64 h-64 border-[4px] border-[#1E5EFF] rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>}
           <div className="absolute w-80 h-80 border-[2px] border-[#1E5EFF] rounded-full"></div>
         </div>
         
         <h2 className="text-2xl font-black tracking-tighter text-center mb-8 relative z-10">Fundamentos de {focus}</h2>
         <div className={cn("text-[5rem] font-black tracking-tighter text-white tabular-nums leading-none mb-8 relative z-10 transition-opacity", isPaused ? "opacity-50 animate-pulse" : "opacity-100")}>
           {formatTime(secondsLeft)}
         </div>
         <p className="text-center text-slate-400 max-w-xs text-sm font-medium relative z-10">
           Mantenha o foco na execução perfeita. Respire fundo e siga o ritmo.
         </p>
      </div>

      <div className="flex flex-col gap-4 relative z-20">
        <button 
          onClick={() => setIsPaused(!isPaused)} 
          className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-sm border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          {isPaused ? 'CONTINUAR' : 'PAUSAR'}
        </button>
        <button 
          onClick={() => onFinish(INITIAL_TIME - secondsLeft)} 
          className="w-full bg-[#1E5EFF] text-white font-bold py-4 rounded-2xl shadow-sm hover:bg-blue-600 transition-colors"
        >
          FINALIZAR TREINO
        </button>
      </div>
    </motion.div>
  );
};

const WorkoutFeedbackScreen = ({ onComplete, focus, level, timeElapsed }: { key?: string, onComplete: (rating: string) => void, focus: string, level: string, timeElapsed: number }) => {
  const [selectedRating, setSelectedRating] = React.useState<string | null>(null);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-white z-[60] flex flex-col pt-16 px-6 pb-12"
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-[#1E5EFF] rounded-full flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
          <Trophy size={48} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-center mb-2">Bom trabalho!</h1>
        <p className="text-slate-500 font-medium text-center mb-12">Você concluiu com sucesso o treino.</p>
        
        <div className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col items-center mb-8">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4">Resumo do Treino</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 uppercase text-center">Fundamentos de {focus}</h3>
          <p className="text-sm text-[#1E5EFF] font-black uppercase tracking-widest mb-2">Nível {level}</p>
          <p className="text-xs text-slate-500 font-bold mb-6">TEMPO TREINADO: {formatTime(timeElapsed)}</p>
          
          <div className="w-full mt-2">
             <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 text-center">Como foi seu desempenho?</p>
             <div className="flex justify-center gap-2">
               {['Ruim', 'Regular', 'Bom', 'Ótimo'].map(label => (
                 <button 
                   key={label} 
                   onClick={() => setSelectedRating(label)}
                   className={cn(
                     "flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 transition-colors uppercase tracking-widest",
                     selectedRating === label ? "border-[#1E5EFF] bg-blue-50 text-[#1E5EFF]" : "hover:border-slate-300"
                   )}
                 >
                   {label}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => onComplete(selectedRating || 'Bom')} 
        className={cn(
          "w-full font-bold py-4 rounded-2xl shadow-sm uppercase tracking-widest text-xs transition-colors",
          selectedRating ? "bg-[#1E5EFF] text-white hover:bg-blue-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"
        )}
        disabled={!selectedRating}
      >
        Voltar ao Início
      </button>
    </motion.div>
  );
};

const TreinosMainScreen = ({ onSelectCategory }: { onSelectCategory: (id: string) => void }) => {
  const categories = [
    { data: dataArremesso, color: "bg-[#1E5EFF] text-white" },
    { data: dataDrible, color: "bg-slate-100 text-slate-900" },
    { data: dataPasse, color: "bg-slate-100 text-slate-900" },
  ];

  return (
    <div className="h-full flex flex-col pt-16 px-6 overflow-y-auto pb-24">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none mb-2">Treinos</h1>
        <p className="text-sm font-medium text-slate-500">Escolha seu foco e evolua no jogo.</p>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.data.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelectCategory(cat.data.id)}
            className="flex items-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-[1.5rem] shadow-sm hover:border-slate-200 transition-colors cursor-pointer"
          >
            <div className={cn("w-16 h-16 rounded-[1.2rem] flex items-center justify-center flex-shrink-0", cat.color)}>
              <cat.data.icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black tracking-tighter text-slate-900">{cat.data.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{cat.data.subtitle}</p>
            </div>
            <ChevronLeft size={20} className="text-slate-300 rotate-180" strokeWidth={2.5} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const TreinosScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  let detailsData = null;
  if (selectedCategory === 'arremesso') detailsData = dataArremesso;
  if (selectedCategory === 'drible') detailsData = dataDrible;
  if (selectedCategory === 'passe') detailsData = dataPasse;

  return (
    <div className="relative h-full w-full">
      <TreinosMainScreen onSelectCategory={setSelectedCategory} />
      
      <AnimatePresence>
        {detailsData && (
          <TrainingDetailsScreen 
            key="details" 
            data={detailsData} 
            onBack={() => setSelectedCategory(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};


// --- App Layout ---

export default function App() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('inicio');
  const [workoutState, setWorkoutState] = useState<'idle' | 'running' | 'feedback'>('idle');
  const [timeElapsed, setTimeElapsed] = useState(0);
  // Forcing streak 0 initially to show notification example
  const [streak, setStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState(3);
  
  // Intelligent Adaptation State
  const [userLevel, setUserLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Iniciante');
  const [suggestedFocus, setSuggestedFocus] = useState('Arremesso');

  // Username State
  const [localName, setLocalName] = useState(() => {
    return localStorage.getItem('maestria_username') || 'Jogador';
  });

  const handleUpdateUserName = (newName: string) => {
    setLocalName(newName);
    localStorage.setItem('maestria_username', newName);
  };

  const displayUserName = user?.displayName || localName;

  // Firebase DB Sync
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStreak(data.streak);
          setWeeklyProgress(data.weeklyProgress);
          setUserLevel(data.userLevel);
          setSuggestedFocus(data.suggestedFocus);
        } else {
          try {
            setDoc(userRef, {
              userId: user.uid,
              streak: 0,
              weeklyProgress: 0,
              userLevel: 'Iniciante',
              suggestedFocus: 'Arremesso',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
          } catch(e) { /* ignore here, caught in promise */ }
        }
      }, (err) => {
         handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsub();
    }
  }, [user]);

  const handleFinishWorkout = (elapsed: number) => {
    setTimeElapsed(elapsed);
    setWorkoutState('feedback');
  };

  const handleCompleteFeedback = async (rating: string) => {
    let newLevel = userLevel;
    // Adaptive Logic
    if (rating === 'Ótimo' || rating === 'Bom') {
      if (userLevel === 'Iniciante') newLevel = 'Intermediário';
      else if (userLevel === 'Intermediário') newLevel = 'Avançado';
    } else if (rating === 'Ruim') {
      if (userLevel === 'Avançado') newLevel = 'Intermediário';
      else if (userLevel === 'Intermediário') newLevel = 'Iniciante';
    }
    
    // Alternate focus
    const newFocus = suggestedFocus === 'Arremesso' ? 'Drible' : 'Arremesso';
    const newStreak = streak + 1;
    const newWeek = Math.min(weeklyProgress + 1, 5);

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          streak: newStreak,
          weeklyProgress: newWeek,
          userLevel: newLevel,
          suggestedFocus: newFocus,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      setStreak(newStreak);
      setWeeklyProgress(newWeek);
      setUserLevel(newLevel);
      setSuggestedFocus(newFocus);
    }

    setWorkoutState('idle');
  };

  return (
    <div className="max-w-md mx-auto bg-white h-screen overflow-hidden relative shadow-2xl sm:rounded-[40px] sm:h-[850px] sm:my-10 sm:border-[8px] sm:border-gray-900 flex flex-col font-sans">
      {/* Mobile status bar mockup */}
      <div className="h-12 w-full flex items-center justify-between px-6 pt-2 z-50 bg-white">
        <span className="text-[15px] font-semibold tracking-tight text-black">9:41</span>
        <div className="flex items-center gap-1.5 opacity-80 text-black">
          <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 10V6M4.5 10V4M8 10V1M11.5 10V3M15 10V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 10C0.947715 10 0.5 9.55228 0.5 9V2C0.5 1.44772 0.947715 1 1.5 1H10.5C11.0523 1 11.5 1.44772 11.5 2V9C11.5 9.55228 11.0523 10 10.5 10H1.5Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M15 3.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'inicio' && (
            <motion.div key="inicio" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <InicioScreen 
                onStartWorkout={() => setWorkoutState('running')}
                streak={streak}
                weeklyProgress={weeklyProgress}
                userLevel={userLevel}
                suggestedFocus={suggestedFocus}
                userName={displayUserName}
                onUpdateUserName={handleUpdateUserName}
              />
            </motion.div>
          )}
          {activeTab === 'treinos' && (
            <motion.div key="treinos" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <TreinosScreen />
            </motion.div>
          )}
          {activeTab === 'quadras' && (
            <motion.div key="quadras" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <QuadrasScreen />
            </motion.div>
          )}
          {activeTab === 'progresso' && (
            <motion.div key="progresso" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <ProgressoScreen />
            </motion.div>
          )}
          {activeTab === 'perfil' && (
            <motion.div key="perfil" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              <PerfilScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <AnimatePresence>
        {workoutState === 'running' && (
          <WorkoutScreen 
            key="workout-screen"
            focus={suggestedFocus}
            onFinish={handleFinishWorkout}
            onCancel={() => setWorkoutState('idle')}
          />
        )}
        {workoutState === 'feedback' && (
          <WorkoutFeedbackScreen 
            key="workout-feedback"
            onComplete={handleCompleteFeedback}
            focus={suggestedFocus}
            level={userLevel}
            timeElapsed={timeElapsed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
