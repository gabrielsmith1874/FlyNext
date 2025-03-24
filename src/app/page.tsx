import Link from 'next/link'

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background images */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80')] dark:opacity-100 opacity-0 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center mb-12">
          <img src="/logo.jpg" alt="FlyNext Logo" className="h-24 w-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to FlyNext
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Your next adventure is just a click away
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
          <Link href="/flights" 
            className="group p-8 border rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 bg-card/80 backdrop-blur-sm hover:border-primary">
            <h2 className="text-2xl font-semibold mb-4 text-foreground group-hover:text-primary">Find Flights</h2>
            <p className="text-muted-foreground">Search and book flights to your favorite destinations</p>
          </Link>
          <Link href="/hotels"
            className="group p-8 border rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 bg-card/80 backdrop-blur-sm hover:border-primary">
            <h2 className="text-2xl font-semibold mb-4 text-foreground group-hover:text-primary">Book Hotels</h2>
            <p className="text-muted-foreground">Discover and reserve comfortable stays worldwide</p>
          </Link>
        </div>
      </div>
    </div>
  )
}