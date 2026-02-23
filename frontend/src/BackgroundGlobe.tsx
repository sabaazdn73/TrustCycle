import { useRef, useEffect, useMemo } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';


interface BackgroundGlobeProps {
  isMobile: boolean;
  accentColor: string;
}

const BackgroundGlobe = ({ isMobile, accentColor }: BackgroundGlobeProps) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);

  const arcsData = useMemo(() => [...Array(25).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: ['#ffffff', '#9333ea', '#6366f1'][Math.floor(Math.random() * 3)],
  })), []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 25, lng: 40, altitude: 1.7 });
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = false;
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: isMobile ? 0 : '30%',
      width: isMobile ? '100vw' : '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        width={window.innerWidth}
        height={window.innerHeight}
        showAtmosphere={true}
        atmosphereColor={accentColor}
        atmosphereAltitude={0.2}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={2}
        arcDashAnimateTime={2000}
        arcStroke={0.4}
      />
    </div>
  );
};

//to call 
export default BackgroundGlobe;