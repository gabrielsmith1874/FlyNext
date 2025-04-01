// (or whichever file uses the SunIcon)
import SunIcon from '@/components/icons/SunIcon';
// ...existing imports...

export default function ThemeToggle() {
  // ...existing code...
  
  return (
    <button onClick={onClick} className="p-2 rounded-full ...">
      <SunIcon className="h-5 w-5 text-..." />
      {/* ...existing elements... */}
    </button>
  );
}
