"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  CreditCard,
  LogOut,
  Camera,
  Mail,
  Phone,
  MapPin,
  Check,
  ChevronRight,
  Smartphone,
  Monitor,
  Trash2,
  Download,
  Key,
  Link2,
  AlertTriangle,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const notificationSettings = [
  {
    id: "trip-reminders",
    title: "Trip Reminders",
    description: "Get notified before your upcoming trips",
    enabled: true,
  },
  {
    id: "booking-updates",
    title: "Booking Updates",
    description: "Receive updates about your flight and hotel bookings",
    enabled: true,
  },
  {
    id: "price-alerts",
    title: "Price Alerts",
    description: "Get notified when prices drop for saved destinations",
    enabled: false,
  },
  {
    id: "weekly-digest",
    title: "Weekly Digest",
    description: "A summary of your travel planning activity",
    enabled: true,
  },
  {
    id: "marketing",
    title: "Marketing & Promotions",
    description: "Special offers and travel inspiration",
    enabled: false,
  },
  {
    id: "chat-notifications",
    title: "Chat Notifications",
    description: "Get notified when AI agents respond",
    enabled: true,
  },
]

const connectedAccounts = [
  {
    id: "google",
    name: "Google",
    connected: true,
    icon: "🔵",
  },
  {
    id: "apple",
    name: "Apple",
    connected: false,
    icon: "🍎",
  },
  {
    id: "github",
    name: "GitHub",
    connected: false,
    icon: "⚫",
  },
]

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("profile")
  const [notifications, setNotifications] = useState(notificationSettings)
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  })

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.full_name || "",
        email: user.email || "",
        phone: "",
        location: "",
      })
    }
  }, [user])

  const toggleNotification = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    )
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      // In production, this would call an API to update the user profile
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const settingsSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Moon },
    { id: "preferences", label: "Preferences", icon: Globe },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
  ]

  // Get display info
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Traveler"
  const displayEmail = user?.email || ""
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 shrink-0">
          <div className="bg-card/50 border border-border rounded-xl p-2 sticky top-24">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                  activeSection === section.id
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}

            {/* Logout Button */}
            <div className="border-t border-border mt-4 pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <>
              {/* Profile Card */}
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-xl font-serif font-semibold text-foreground">
                    Profile Information
                  </h2>
                  <button
                    onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                    disabled={isSaving}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium transition-all",
                      isEditing
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    )}
                  >
                    {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
                  </button>
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-primary/20 flex items-center justify-center">
                      <User className="w-12 h-12 text-primary" />
                    </div>
                    {isEditing && (
                      <button className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-foreground" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{displayName}</h3>
                    <p className="text-muted-foreground">Member since {memberSince}</p>
                    <div className="flex items-center gap-1 mt-1 text-emerald-400 text-sm">
                      <Check className="w-4 h-4" />
                      <span>Verified Account</span>
                    </div>
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      disabled={!isEditing}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border transition-all text-foreground",
                        isEditing
                          ? "bg-muted border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          : "bg-card border-border cursor-not-allowed opacity-60"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder={isEditing ? "Add phone number" : "Not set"}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border transition-all text-foreground placeholder:text-muted-foreground",
                        isEditing
                          ? "bg-muted border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          : "bg-card border-border cursor-not-allowed opacity-60"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      disabled={!isEditing}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border transition-all text-foreground",
                        isEditing
                          ? "bg-muted border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          : "bg-card border-border cursor-not-allowed opacity-60"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          location: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      placeholder={isEditing ? "Add location" : "Not set"}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border transition-all text-foreground placeholder:text-muted-foreground",
                        isEditing
                          ? "bg-muted border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          : "bg-card border-border cursor-not-allowed opacity-60"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connected Accounts
                </h2>
                <div className="space-y-4">
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{account.icon}</span>
                        <div>
                          <h4 className="font-medium text-foreground">{account.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {account.connected ? displayEmail : "Not connected"}
                          </p>
                        </div>
                      </div>
                      <button
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-all",
                          account.connected
                            ? "text-destructive hover:bg-destructive/10"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        )}
                      >
                        {account.connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="bg-card/50 border border-border rounded-xl p-6">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                Notification Preferences
              </h2>
              <p className="text-muted-foreground mb-6">
                Choose what notifications you want to receive
              </p>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleNotification(notification.id)}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-all",
                        notification.enabled ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          notification.enabled ? "left-7" : "left-1"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Notification Channels */}
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Notification Channels
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-primary/20 text-center">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium text-foreground">Email</h4>
                    <p className="text-xs text-muted-foreground mt-1">Enabled</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border text-center">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-medium text-foreground">Push</h4>
                    <p className="text-xs text-muted-foreground mt-1">Disabled</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-primary/20 text-center">
                    <Monitor className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium text-foreground">Desktop</h4>
                    <p className="text-xs text-muted-foreground mt-1">Enabled</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="bg-card/50 border border-border rounded-xl p-6">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                Appearance
              </h2>
              <p className="text-muted-foreground mb-6">
                Customize how Orbis AI looks for you
              </p>

              {/* Theme Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-foreground mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "light", label: "Light", icon: Sun },
                    { id: "system", label: "System", icon: Monitor },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as typeof theme)}
                      className={cn(
                        "p-6 rounded-xl border-2 transition-all",
                        theme === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/50 hover:border-muted-foreground"
                      )}
                    >
                      <t.icon
                        className={cn(
                          "w-8 h-8 mx-auto mb-3",
                          theme === t.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          theme === t.id ? "text-primary" : "text-foreground"
                        )}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Accent Color</h3>
                <div className="flex gap-3">
                  {[
                    { color: "bg-primary", name: "Gold" },
                    { color: "bg-emerald-500", name: "Emerald" },
                    { color: "bg-blue-500", name: "Blue" },
                    { color: "bg-purple-500", name: "Purple" },
                    { color: "bg-rose-500", name: "Rose" },
                  ].map((accent, i) => (
                    <button
                      key={i}
                      className={cn(
                        "w-10 h-10 rounded-full hover:scale-110 transition-transform",
                        accent.color,
                        i === 0 && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                      )}
                      title={accent.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <div className="bg-card/50 border border-border rounded-xl p-6">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                Preferences
              </h2>
              <p className="text-muted-foreground mb-6">Customize your experience</p>

              <div className="space-y-4">
                {[
                  { icon: Globe, label: "Language", value: "English (US)" },
                  { icon: Calendar, label: "Timezone", value: "America/Los_Angeles" },
                  { icon: CreditCard, label: "Currency", value: "USD" },
                  { icon: MapPin, label: "Distance Unit", value: "Miles (mi)" },
                ].map((pref, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <pref.icon className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <h4 className="font-medium text-foreground">{pref.label}</h4>
                        <p className="text-sm text-muted-foreground">{pref.value}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <>
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                  Security
                </h2>
                <p className="text-muted-foreground mb-6">Manage your account security</p>

                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-all">
                    <div className="flex items-center gap-4">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <h4 className="font-medium text-foreground">Change Password</h4>
                        <p className="text-sm text-muted-foreground">
                          Last changed 3 months ago
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-4">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium text-foreground">
                          Two-Factor Authentication
                        </h4>
                        <p className="text-sm text-emerald-400">Enabled</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-all">
                      Configure
                    </button>
                  </div>

                  <button className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-all">
                    <div className="flex items-center gap-4">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <h4 className="font-medium text-foreground">Active Sessions</h4>
                        <p className="text-sm text-muted-foreground">3 devices logged in</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6">
                <h2 className="text-xl font-serif font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </h2>
                <p className="text-muted-foreground mb-6">
                  Irreversible actions for your account
                </p>

                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border hover:border-destructive/50 transition-all">
                    <div className="flex items-center gap-4">
                      <Download className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <h4 className="font-medium text-foreground">Export Data</h4>
                        <p className="text-sm text-muted-foreground">
                          Download all your data
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/30 hover:bg-destructive/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Trash2 className="w-5 h-5 text-destructive" />
                      <div className="text-left">
                        <h4 className="font-medium text-destructive">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and data
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-destructive" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <div className="bg-card/50 border border-border rounded-xl p-6">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                Billing & Plans
              </h2>
              <p className="text-muted-foreground mb-6">
                Manage your subscription and payment methods
              </p>

              {/* Current Plan */}
              <div className="mb-8 p-6 bg-gradient-to-br from-primary/20 to-accent/10 rounded-xl border border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-primary font-medium uppercase tracking-wide">
                      Current Plan
                    </span>
                    <h3 className="text-2xl font-bold text-foreground mt-1">Free Tier</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-foreground">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-primary/20 rounded-full text-sm text-primary">
                    5 chats/day
                  </span>
                  <span className="px-3 py-1 bg-primary/20 rounded-full text-sm text-primary">
                    Basic AI agents
                  </span>
                  <span className="px-3 py-1 bg-primary/20 rounded-full text-sm text-primary">
                    Community support
                  </span>
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all">
                    Upgrade Plan
                  </button>
                  <button className="px-4 py-2 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-all">
                    View All Plans
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Payment Method</h3>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
                      CARD
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">No payment method</h4>
                      <p className="text-sm text-muted-foreground">Add a card to upgrade</p>
                    </div>
                  </div>
                  <button className="text-primary hover:text-primary/80 transition-colors">
                    Add Card
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Billing History</h3>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No billing history yet</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-destructive/30 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-destructive">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete your account? All your data, including
              itineraries, chats, and collections will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-muted rounded-lg font-medium text-foreground hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-all">
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
