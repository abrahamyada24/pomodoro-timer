'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Settings, Volume2 } from 'lucide-react'

export default function PomodoroApp(): JSX.Element {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  
  // Settings
  const [workDuration, setWorkDuration] = useState(25)
  const [shortBreakDuration, setShortBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [alarmVolume, setAlarmVolume] = useState(0.5)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Create beep sound using Web Audio API
  const playBeep = (): void => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(alarmVolume * 0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Audio not supported or failed:', error)
    }
  }

  // Timer logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Timer finished
      playAlarm()
      if (isBreak) {
        // Break finished, start new work session
        setIsBreak(false)
        setTimeLeft(workDuration * 60)
      } else {
        // Work session finished
        const newCompletedCount = completedPomodoros + 1
        setCompletedPomodoros(newCompletedCount)
        setIsBreak(true)
        // Determine break type
        const isLongBreak = newCompletedCount % 4 === 0
        setTimeLeft(isLongBreak ? longBreakDuration * 60 : shortBreakDuration * 60)
      }
      setIsActive(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, timeLeft, isBreak, workDuration, shortBreakDuration, longBreakDuration, completedPomodoros])

  const playAlarm = (): void => {
    // Play beep sound
    playBeep()
    
    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? 'Break time is over!' : 'Pomodoro completed!', {
        body: isBreak ? 'Time to get back to work!' : 'Time for a break!',
        icon: '/favicon.ico'
      })
    }
  }

  const toggleTimer = (): void => {
    setIsActive(!isActive)
    
    // Initialize audio context on first user interaction
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.log('Audio context creation failed:', error)
      }
    }
  }

  const resetTimer = (): void => {
    setIsActive(false)
    setIsBreak(false)
    setTimeLeft(workDuration * 60)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const resetSession = (): void => {
    resetTimer()
    setCompletedPomodoros(0)
  }

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const totalDuration = isBreak 
    ? (completedPomodoros > 0 && completedPomodoros % 4 === 0 ? longBreakDuration : shortBreakDuration) * 60
    : workDuration * 60
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🍅 Pomodoro Timer</h1>
          <p className="text-gray-600">
            {isBreak ? 'Break Time' : 'Focus Time'} • Session {completedPomodoros + 1}
          </p>
        </div>

        {/* Main Timer Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          {/* Progress Ring */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#f3f4f6"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={isBreak ? "#22c55e" : "#ef4444"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-gray-800 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wide">
                  {isBreak ? 'Break' : 'Focus'}
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={toggleTimer}
              className={`flex items-center justify-center w-16 h-16 rounded-full text-white font-semibold transition-all transform hover:scale-105 ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200' 
                  : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
              }`}
            >
              {isActive ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={resetTimer}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all transform hover:scale-105 shadow-lg shadow-gray-200"
            >
              <RotateCcw size={24} />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all transform hover:scale-105 shadow-lg shadow-blue-200"
            >
              <Settings size={24} />
            </button>
          </div>

          {/* Session Info */}
          <div className="text-center">
            <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
              <div>
                <span className="font-semibold">{completedPomodoros}</span> completed
              </div>
              <div>
                Next: {isBreak ? 'Focus' : (completedPomodoros + 1) % 4 === 0 ? 'Long Break' : 'Short Break'}
              </div>
            </div>
            
            <button
              onClick={resetSession}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset Session
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Settings className="mr-2" size={20} />
              Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{workDuration} min</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Break (minutes)
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{shortBreakDuration} min</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Long Break (minutes)
                </label>
                <input
                  type="range"
                  min="15"
                  max="45"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{longBreakDuration} min</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Volume2 className="mr-1" size={16} />
                  Alarm Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={alarmVolume}
                  onChange={(e) => setAlarmVolume(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{Math.round(alarmVolume * 100)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500">
          <p>🍅 Work for {workDuration} minutes, then take a {shortBreakDuration}-minute break</p>
          <p>After 4 pomodoros, enjoy a {longBreakDuration}-minute long break!</p>
        </div>
      </div>
    </div>
  )
}