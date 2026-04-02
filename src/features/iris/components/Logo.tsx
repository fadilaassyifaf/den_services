// components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div className="p-4 md:p-6">
      <Image
        src="/logo-tbg.jpg"
        alt="Tower Bersama Group"
        width={140}
        height={60}
        className="object-contain"
        priority
      />
    </div>
  );
}