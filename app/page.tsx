'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface Candidate {
  id: number;
  name: string;
  votes: number;
  color: string;
  image: string; // Maintenant c'est le chemin vers l'image
  party: string;
}

const DEFAULT_CANDIDATES: Candidate[] = [
  { id: 1, name: "Yvan Anthony", votes: 0, color: "bg-blue-500", image: "/antony.jpeg", party: "BAN-KAI... ASHISOGI JIZO" },
  { id: 2, name: "Lo Cosmo", votes: 0, color: "bg-indigo-500", image: "/Lo Cosmo.jpeg", party: "Lo Cosmo" },
  { id: 3, name: "BLK42", votes: 0, color: "bg-red-500", image: "/blk42.jpeg", party: "Créateur de contenu" },
  { id: 4, name: "Smooki", votes: 0, color: "bg-green-500", image: "/smooki.jpeg", party: "Creéateur de contenu" },
  { id: 5, name: "Mister Tyga", votes: 0, color: "bg-purple-500", image: "/Mister.jpeg", party: "Web-Chroniquer" },
  { id: 6, name: "Lina Kadjo", votes: 0, color: "bg-pink-500", image: "/lina.jpeg", party: "" },
  { id: 7, name: "Sergio Ramos 1X", votes: 0, color: "bg-yellow-500", image: "/Sergio Ramos.jpeg", party: "1⚔️ KAMIKAZE" },
  { id: 8, name: "Carine N'guessan", votes: 0, color: "bg-indigo-500", image: "/Carine N'guessan.jpeg", party: "L'Amazone du Chetté" },
  { id: 9, name: "Danielle Gnamba", votes: 0, color: "bg-teal-500", image: "/Danielle gnamba.jpeg", party: "Personne d'impact" },
  { id: 10, name: "Lil 1X gnanmien Okocha", votes: 0, color: "bg-orange-500", image: "/okocha.jpeg", party: "Parti Énergique" },
  { id: 11, name: "Tapily Mohamed", votes: 0, color: "bg-cyan-500", image: "/tapy mohamed.jpeg", party: "La hawla wala quwata illa billa" },
  { id: 12, name: "Carine Giina", votes: 0, color: "bg-rose-500", image: "/Carine giina.jpeg", party: "" },
  { id: 13, name: "Guichou", votes: 0, color: "bg-lime-500", image: "/Guichou.jpeg", party: "Ascende Superius" },
  { id: 14, name: "DBZ a main levée", votes: 0, color: "bg-amber-500", image: "/dbz.jpeg", party: "La main levée suprême" },
  { id: 15, name: "Linda la machette", votes: 0, color: "bg-emerald-500", image: "/linda.jpeg", party: "Linda lamachette" }
];

export default function VotingApp() {
  const [candidates, setCandidates] = useState<Candidate[]>(DEFAULT_CANDIDATES);
  const [canVote, setCanVote] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userVoteCount, setUserVoteCount] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVoteTimeRef = useRef<number>(0);

  // Charger les votes depuis Supabase
  const loadVotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('candidate_id');

      if (error) throw error;

      if (data) {
        setCandidates(prev => prev.map(candidate => {
          const voteData = data.find(v => v.candidate_id === candidate.id);
          return {
            ...candidate,
            votes: voteData?.votes || 0
          };
        }));
      }
    } catch (error) {
      console.error('Erreur chargement votes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Écouter les changements en temps réel
  useEffect(() => {
    loadVotes();

    const subscription = supabase
      .channel('votes-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'votes' 
        }, 
        () => {
          loadVotes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadVotes]);

  // Timer pour le délai de vote
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setCanVote(true);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft]);

  // Restaurer le délai de vote au chargement
  useEffect(() => {
    const savedLastVote = localStorage.getItem('lastVoteTime');
    const savedVoteCount = localStorage.getItem('userVoteCount');
    
    if (savedLastVote) {
      const lastVoteTime = parseInt(savedLastVote);
      const now = Date.now();
      const timeSinceLastVote = now - lastVoteTime;
      
      if (timeSinceLastVote < 60000) {
        setCanVote(false);
        setTimeLeft(Math.ceil((60000 - timeSinceLastVote) / 1000));
        lastVoteTimeRef.current = lastVoteTime;
      }
    }
    
    if (savedVoteCount) {
      setUserVoteCount(parseInt(savedVoteCount));
    }
  }, []);

  const handleImageError = useCallback((candidateId: number) => {
    setImageErrors(prev => new Set(prev).add(candidateId));
  }, []);

  const voteForCandidate = useCallback(async (candidateId: number) => {
    if (!canVote) return;

    const now = Date.now();
    
    // Vérifier le délai côté client aussi
    if (lastVoteTimeRef.current > 0 && now - lastVoteTimeRef.current < 60000) {
      return;
    }

    try {
      // Incrémenter le vote dans la base de données
      const { error } = await supabase.rpc('increment_vote', {
        candidate_id: candidateId
      });

      if (error) throw error;

      // Bloquer les votes pendant 1 minute
      setCanVote(false);
      setTimeLeft(60);
      lastVoteTimeRef.current = now;
      
      // Sauvegarder le temps du dernier vote
      localStorage.setItem('lastVoteTime', now.toString());
      
      // Incrémenter le compteur de votes utilisateur
      setUserVoteCount(prev => {
        const newCount = prev + 1;
        localStorage.setItem('userVoteCount', newCount.toString());
        return newCount;
      });

    } catch (error) {
      console.error('Erreur vote:', error);
    }
  }, [canVote]);

  const getPercentage = useCallback((votes: number): number => {
    const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    if (totalVotes === 0) return 0;
    return (votes / totalVotes) * 100;
  }, [candidates]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);
  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-4">🗳️</div>
          <h1 className="text-2xl font-bold">Chargement des votes en temps réel...</h1>
          <p className="text-white/60 mt-2">Connexion à la base de données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            ⚔️ Élections du Président(e) des ULTRA 2025 ⚔️
          </h1>
          <p className="text-xl text-white/80 mb-6">
            Votez pour votre candidat préféré - 1 vote par minute
          </p>
          
          {/* Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/80 text-sm">Total des votes</p>
              <p className="text-2xl font-bold text-white">{totalVotes}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/80 text-sm">Vos votes</p>
              <p className="text-2xl font-bold text-white">{userVoteCount}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/80 text-sm">Statut</p>
              <p className={`text-lg font-bold ${canVote ? 'text-green-300' : 'text-yellow-300'}`}>
                {canVote ? '✅ Prêt à voter' : '⏳ En attente'}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/80 text-sm">Prochain vote</p>
              <p className={`text-2xl font-bold ${timeLeft > 0 ? 'text-yellow-300' : 'text-green-300'}`}>
                {timeLeft > 0 ? formatTime(timeLeft) : 'Maintenant!'}
              </p>
            </div>
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="text-center">
                {/* Image du candidat */}
                <div className="relative w-24 h-24 mx-auto mb-3">
                  {imageErrors.has(candidate.id) ? (
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-4xl">
                      👤
                    </div>
                  ) : (
                    <Image
                      src={candidate.image}
                      alt={candidate.name}
                      width={96}
                      height={96}
                      className="rounded-full object-cover w-24 h-24 border-2 border-gray-200"
                      onError={() => handleImageError(candidate.id)}
                      priority={candidate.id <= 5} // Charge les premières images en priorité
                    />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-1">{candidate.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{candidate.party}</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{candidate.votes} votes</span>
                    <span className="font-bold">{getPercentage(candidate.votes).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${candidate.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${getPercentage(candidate.votes)}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={() => voteForCandidate(candidate.id)}
                  disabled={!canVote}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-300 ${
                    canVote 
                      ? `${candidate.color} hover:opacity-90 transform hover:scale-105 shadow-lg` 
                      : 'bg-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {canVote ? '🗳️ Voter Maintenant' : `⏳ Attendez ${formatTime(timeLeft)}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Results Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white border border-white/20">
          <h2 className="text-3xl font-bold mb-6 text-center">📊 Résultats en Temps Réel</h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {sortedCandidates.map((candidate, index) => (
              <div 
                key={candidate.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 transition-all duration-300 hover:bg-white/10"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12">
                      {imageErrors.has(candidate.id) ? (
                        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-lg">
                          👤
                        </div>
                      ) : (
                        <Image
                          src={candidate.image}
                          alt={candidate.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover w-12 h-12 border-2 border-white/20"
                          onError={() => handleImageError(candidate.id)}
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{candidate.name}</div>
                      <div className="text-white/60 text-sm">{candidate.party}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-300">
                      {getPercentage(candidate.votes).toFixed(1)}%
                    </div>
                    <div className="text-white/80">{candidate.votes} votes</div>
                  </div>
                  {index === 0 && totalVotes > 0 && (
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                      🥇 Leader
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{totalVotes}</div>
              <div className="text-white/60 text-sm">Votes Totaux</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">
                {candidates.filter(c => c.votes > 0).length}
              </div>
              <div className="text-white/60 text-sm">Candidats Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">
                {Math.max(...candidates.map(c => c.votes))}
              </div>
              <div className="text-white/60 text-sm">Votes Maximum</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-300">
                {userVoteCount}
              </div>
              <div className="text-white/60 text-sm">Vos Votes</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-8 text-white/60">
          <p>💡 Les résultats se mettent à jour en temps réel pour tous les utilisateurs !</p>
          <p className="text-sm mt-1">Un vote par minute maximum par personne</p>
        </div>

        {/* Reset Button (Admin) */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-sm">
            Développé par <strong>N&lsquo;dja Asaph</strong> 📞 0140045652 / 07 10 14 59 75
          </p>
        </div>
      </div>
    </div>
  );
}