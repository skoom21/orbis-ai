"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { verifyOtp, resendOtp } = useAuth()
  
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push('/signup')
    }
  }, [email, router])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index: number, value: string) => {
    // Allow alphanumeric characters (Supabase tokens can have letters)
    if (value && !/^[a-zA-Z0-9]$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value.toUpperCase()
    setOtp(newOtp)
    setError(null)
    
    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
    
    if (pastedData.length === 8) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      inputRefs.current[7]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const otpString = otp.join('')
    
    if (otpString.length !== 8) {
      setError('Please enter all 8 characters')
      return
    }

    setIsLoading(true)

    const result = await verifyOtp(email, otpString)

    if (result.success) {
      setSuccess(true)
      // Small delay to show success message
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } else {
      setError(result.error?.message || 'Invalid verification code')
    }
    
    setIsLoading(false)
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    
    setError(null)
    setIsLoading(true)

    const result = await resendOtp(email)

    if (result.success) {
      setResendCooldown(60) // 60 second cooldown
      setOtp(['', '', '', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      setError(result.error?.message || 'Failed to resend code')
    }
    
    setIsLoading(false)
  }

  if (!email) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Link
        href="/signup"
        className="absolute top-6 left-6 z-20 text-zinc-400 hover:text-[#e78a53] transition-colors duration-200 flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Sign Up</span>
      </Link>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#e78a53]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#e78a53]/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Image 
                src="/images/logo.svg"
                alt="Orbis AI Logo"
                width={48}
                height={48}
                className="text-[#e78a53] rounded-full"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Verify your email</h1>
          <p className="text-zinc-400">
            We sent an 8-character code to<br />
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {/* Verification Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8"
        >
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Email verified successfully! Redirecting...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-10 h-12 text-center text-xl font-bold bg-zinc-800/50 border-zinc-700 text-white focus:border-[#e78a53] focus:ring-[#e78a53]/20"
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.join('').length !== 8}
                className="w-full bg-[#e78a53] hover:bg-[#e78a53]/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <p className="text-zinc-400 text-sm">
                Didn&apos;t receive the code?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-zinc-500">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-[#e78a53] hover:text-[#e78a53]/80 font-medium disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-xs">
              Check your spam folder if you don&apos;t see the email
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
