import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import { Mic2, Palette, Zap, ArrowRight } from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Mic2 className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
        </div>
        <SignInButton mode="modal">
          <Button variant="outline">Sign In</Button>
        </SignInButton>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Make Every Podcast Episode
            <span className="text-purple-600"> Instantly Recognizable</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Automatically add episode numbers and navigation indicators to your podcast artwork.
            No more confusion about which episode you're listening to.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </SignInButton>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Automatic Episode Numbering</h3>
            <p className="text-gray-600">
              Import your RSS feed and we'll automatically add episode numbers to every piece of artwork.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Full Customization</h3>
            <p className="text-gray-600">
              Choose fonts, colors, placement, and transparency. Make it match your brand perfectly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <ArrowRight className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Navigation Indicators</h3>
            <p className="text-gray-600">
              Add swipe direction hints so listeners always know which way to go for the next episode.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to improve your podcast UX?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join podcasters who are making their shows easier to navigate.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Creating Artwork
            </Button>
          </SignInButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>© 2025 {APP_TITLE}. Making podcasts easier to navigate.</p>
      </footer>
    </div>
  );
}
