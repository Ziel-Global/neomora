import { Link } from 'react-router-dom';
import { Shield, Users, User, ArrowRight, ChevronDown, Flag } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const portals = [
  {
    title: 'Admin Portal',
    description: 'Full system access for event management, participants, and analytics.',
    icon: Shield,
    href: '/login/admin',
    action: 'Access Portal'
  },
  {
    title: 'Staff Portal',
    description: 'Operational access for validations, coordination, and task management.',
    icon: Users,
    href: '/login/staff',
    action: 'Login'
  },
  {
    title: 'Participant Portal',
    description: 'View your status, documents, travel details, and support.',
    icon: User,
    href: '/login/participant',
    action: 'View Profile'
  },
  {
    title: 'Team Manager',
    description: 'Register and manage your country\'s delegation, teams, and athletes.',
    icon: Flag,
    href: '/login/manager',
    action: 'Manage Teams'
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/neomora1.png"
              alt="NeoMora"
              className="h-8 w-auto"
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative text-white overflow-hidden pb-32">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/leghari.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-emerald-900/80 to-background" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">

          <img
            src="/neomoraWhite.png"
            alt="NeoMora"
            className="h-24 mx-auto mb-8 drop-shadow-lg"
          />

          <p className="text-xl text-emerald-50 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Access essential event services, manage registrations, and coordinate logistics through our secure online portal.
          </p>

          <Button
            size="lg"
            className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold h-12 px-8 rounded-full shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
            onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Services Section */}
      <div id="services-section" className="flex-1 -mt-20 relative z-10 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-4">
            {portals.map((portal) => (
              <Link key={portal.href} to={portal.href}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-md group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pl-8 pt-8">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <portal.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-emerald-900 transition-colors">
                      {portal.title}
                    </CardTitle>
                    <CardDescription className="text-base mt-2 line-clamp-2">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-8 pb-8">
                    <span className="inline-flex items-center text-sm font-semibold text-emerald-700 group-hover:translate-x-1 transition-transform">
                      {portal.action}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick Stats or Info Section (Optional filler for "premium" feel) */}
          <div className="mt-24 grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <h3 className="text-4xl font-bold text-emerald-900 mb-2">24/7</h3>
              <p className="text-muted-foreground">System Availability</p>
            </div>
            <div className="p-6 border-l border-r border-border/50">
              <h3 className="text-4xl font-bold text-emerald-900 mb-2">10k+</h3>
              <p className="text-muted-foreground">Active Participants</p>
            </div>
            <div className="p-6">
              <h3 className="text-4xl font-bold text-emerald-900 mb-2">Secure</h3>
              <p className="text-muted-foreground">End-to-End Encryption</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img
                src="/neomora1.png"
                alt="NeoMora"
                className="h-5 w-auto brightness-0 invert"
              />
            </div>
            <div className="text-sm">
              © 2026 Neomora. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
