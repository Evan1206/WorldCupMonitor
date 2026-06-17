import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import {
  Globe2,
  MapPin,
  MousePointer2,
  Pause,
  Play,
  Rotate3D,
  Search,
  Trophy,
  ZoomIn,
} from 'lucide-react';
import { useMatches } from './hooks/useMatches';
import './styles.css';

// ─── Confederation colours ────────────────────────────────────────────────────

const CONF_COLORS = {
  UEFA:     '#4a9eff',
  CONMEBOL: '#2ecc71',
  CONCACAF: '#f39c12',
  CAF:      '#f1c40f',
  AFC:      '#e74c3c',
  OFC:      '#9b59b6',
};
const CITY_COLOR = '#ffd700';

// ─── Data ────────────────────────────────────────────────────────────────────

const hostCities = [
  { id: 'v-nyc', city: 'New York / New Jersey', country: 'USA',    lat:  40.81, lng:  -74.07, stadium: 'MetLife Stadium',          capacity: 82500 },
  { id: 'v-la',  city: 'Los Angeles',           country: 'USA',    lat:  34.01, lng: -118.34, stadium: 'SoFi Stadium',             capacity: 70240 },
  { id: 'v-dal', city: 'Dallas',                country: 'USA',    lat:  32.75, lng:  -97.09, stadium: 'AT&T Stadium',             capacity: 80000 },
  { id: 'v-sf',  city: 'San Francisco',         country: 'USA',    lat:  37.40, lng: -121.97, stadium: "Levi's Stadium",           capacity: 68500 },
  { id: 'v-mia', city: 'Miami',                 country: 'USA',    lat:  25.96, lng:  -80.24, stadium: 'Hard Rock Stadium',        capacity: 65326 },
  { id: 'v-hou', city: 'Houston',               country: 'USA',    lat:  29.68, lng:  -95.41, stadium: 'NRG Stadium',              capacity: 72220 },
  { id: 'v-atl', city: 'Atlanta',               country: 'USA',    lat:  33.76, lng:  -84.40, stadium: 'Mercedes-Benz Stadium',    capacity: 71000 },
  { id: 'v-sea', city: 'Seattle',               country: 'USA',    lat:  47.60, lng: -122.33, stadium: 'Lumen Field',              capacity: 69000 },
  { id: 'v-kc',  city: 'Kansas City',           country: 'USA',    lat:  39.05, lng:  -94.48, stadium: 'Arrowhead Stadium',        capacity: 76416 },
  { id: 'v-phi', city: 'Philadelphia',          country: 'USA',    lat:  39.90, lng:  -75.17, stadium: 'Lincoln Financial Field',  capacity: 69176 },
  { id: 'v-bos', city: 'Boston',                country: 'USA',    lat:  42.09, lng:  -71.26, stadium: 'Gillette Stadium',         capacity: 65878 },
  { id: 'v-van', city: 'Vancouver',             country: 'Canada', lat:  49.28, lng: -123.11, stadium: 'BC Place',                capacity: 54500 },
  { id: 'v-tor', city: 'Toronto',               country: 'Canada', lat:  43.63, lng:  -79.42, stadium: 'BMO Field',               capacity: 45000 },
  { id: 'v-gdl', city: 'Guadalajara',           country: 'Mexico', lat:  20.69, lng: -103.37, stadium: 'Estadio Akron',           capacity: 49850 },
  { id: 'v-mxc', city: 'Mexico City',           country: 'Mexico', lat:  19.30, lng:  -99.15, stadium: 'Estadio Azteca',          capacity: 87523 },
  { id: 'v-mty', city: 'Monterrey',             country: 'Mexico', lat:  25.67, lng: -100.31, stadium: 'Estadio BBVA',            capacity: 53464 },
];

const fallbackTeams = [
  // UEFA (16)
  { id: 'ger', name: 'Germany',     flag: '🇩🇪', lat:  52.52, lng:  13.41, conf: 'UEFA' },
  { id: 'fra', name: 'France',      flag: '🇫🇷', lat:  48.86, lng:   2.35, conf: 'UEFA' },
  { id: 'esp', name: 'Spain',       flag: '🇪🇸', lat:  40.42, lng:  -3.70, conf: 'UEFA' },
  { id: 'eng', name: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', lat:  51.51, lng:  -0.13, conf: 'UEFA' },
  { id: 'por', name: 'Portugal',    flag: '🇵🇹', lat:  38.72, lng:  -9.14, conf: 'UEFA' },
  { id: 'ned', name: 'Netherlands', flag: '🇳🇱', lat:  52.37, lng:   4.90, conf: 'UEFA' },
  { id: 'bel', name: 'Belgium',     flag: '🇧🇪', lat:  50.85, lng:   4.35, conf: 'UEFA' },
  { id: 'cro', name: 'Croatia',     flag: '🇭🇷', lat:  45.81, lng:  15.98, conf: 'UEFA' },
  { id: 'sui', name: 'Switzerland', flag: '🇨🇭', lat:  46.95, lng:   7.44, conf: 'UEFA' },
  { id: 'den', name: 'Denmark',     flag: '🇩🇰', lat:  55.68, lng:  12.57, conf: 'UEFA' },
  { id: 'pol', name: 'Poland',      flag: '🇵🇱', lat:  52.23, lng:  21.01, conf: 'UEFA' },
  { id: 'srb', name: 'Serbia',      flag: '🇷🇸', lat:  44.80, lng:  20.46, conf: 'UEFA' },
  { id: 'aut', name: 'Austria',     flag: '🇦🇹', lat:  48.21, lng:  16.37, conf: 'UEFA' },
  { id: 'sco', name: 'Scotland',    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', lat:  55.95, lng:  -3.19, conf: 'UEFA' },
  { id: 'ukr', name: 'Ukraine',     flag: '🇺🇦', lat:  50.45, lng:  30.52, conf: 'UEFA' },
  { id: 'tur', name: 'Turkey',      flag: '🇹🇷', lat:  39.93, lng:  32.86, conf: 'UEFA' },
  // CONMEBOL (6)
  { id: 'bra', name: 'Brazil',    flag: '🇧🇷', lat: -15.78, lng:  -47.93, conf: 'CONMEBOL' },
  { id: 'arg', name: 'Argentina', flag: '🇦🇷', lat: -34.60, lng:  -58.38, conf: 'CONMEBOL' },
  { id: 'uru', name: 'Uruguay',   flag: '🇺🇾', lat: -34.90, lng:  -56.19, conf: 'CONMEBOL' },
  { id: 'col', name: 'Colombia',  flag: '🇨🇴', lat:   4.71, lng:  -74.07, conf: 'CONMEBOL' },
  { id: 'ecu', name: 'Ecuador',   flag: '🇪🇨', lat:  -0.23, lng:  -78.52, conf: 'CONMEBOL' },
  { id: 'ven', name: 'Venezuela', flag: '🇻🇪', lat:  10.49, lng:  -66.88, conf: 'CONMEBOL' },
  // CONCACAF (6)
  { id: 'usa', name: 'USA',        flag: '🇺🇸', lat:  38.89, lng:  -77.04, conf: 'CONCACAF' },
  { id: 'can', name: 'Canada',     flag: '🇨🇦', lat:  45.42, lng:  -75.69, conf: 'CONCACAF' },
  { id: 'mex', name: 'Mexico',     flag: '🇲🇽', lat:  23.63, lng: -102.55, conf: 'CONCACAF' },
  { id: 'pan', name: 'Panama',     flag: '🇵🇦', lat:   8.99, lng:  -79.52, conf: 'CONCACAF' },
  { id: 'crc', name: 'Costa Rica', flag: '🇨🇷', lat:   9.93, lng:  -84.08, conf: 'CONCACAF' },
  { id: 'jam', name: 'Jamaica',    flag: '🇯🇲', lat:  17.99, lng:  -76.79, conf: 'CONCACAF' },
  // CAF (10)
  { id: 'mar', name: 'Morocco',        flag: '🇲🇦', lat:  31.79, lng:  -7.09, conf: 'CAF' },
  { id: 'sen', name: 'Senegal',        flag: '🇸🇳', lat:  14.69, lng: -17.44, conf: 'CAF' },
  { id: 'nga', name: 'Nigeria',        flag: '🇳🇬', lat:   9.06, lng:   7.49, conf: 'CAF' },
  { id: 'cmr', name: 'Cameroon',       flag: '🇨🇲', lat:   3.86, lng:  11.52, conf: 'CAF' },
  { id: 'egy', name: 'Egypt',          flag: '🇪🇬', lat:  30.06, lng:  31.25, conf: 'CAF' },
  { id: 'gha', name: 'Ghana',          flag: '🇬🇭', lat:   5.56, lng:  -0.20, conf: 'CAF' },
  { id: 'alg', name: 'Algeria',        flag: '🇩🇿', lat:  36.74, lng:   3.06, conf: 'CAF' },
  { id: 'tun', name: 'Tunisia',        flag: '🇹🇳', lat:  34.00, lng:   9.02, conf: 'CAF' },
  { id: 'civ', name: "Côte d'Ivoire",  flag: '🇨🇮', lat:   7.54, lng:  -5.55, conf: 'CAF' },
  { id: 'drc', name: 'DR Congo',       flag: '🇨🇩', lat:  -4.32, lng:  15.32, conf: 'CAF' },
  // AFC (8)
  { id: 'jpn', name: 'Japan',        flag: '🇯🇵', lat:  35.69, lng: 139.69, conf: 'AFC' },
  { id: 'kor', name: 'South Korea',  flag: '🇰🇷', lat:  37.57, lng: 126.98, conf: 'AFC' },
  { id: 'aus', name: 'Australia',    flag: '🇦🇺', lat: -25.27, lng: 133.78, conf: 'AFC' },
  { id: 'irn', name: 'Iran',         flag: '🇮🇷', lat:  32.43, lng:  53.69, conf: 'AFC' },
  { id: 'ksa', name: 'Saudi Arabia', flag: '🇸🇦', lat:  24.69, lng:  46.72, conf: 'AFC' },
  { id: 'irq', name: 'Iraq',         flag: '🇮🇶', lat:  33.22, lng:  43.68, conf: 'AFC' },
  { id: 'jor', name: 'Jordan',       flag: '🇯🇴', lat:  31.95, lng:  35.93, conf: 'AFC' },
  { id: 'chn', name: 'China',        flag: '🇨🇳', lat:  35.86, lng: 104.20, conf: 'AFC' },
  // OFC + inter-conf (2)
  { id: 'nzl', name: 'New Zealand', flag: '🇳🇿', lat: -40.90, lng: 174.89, conf: 'OFC' },
  { id: 'idn', name: 'Indonesia',   flag: '🇮🇩', lat:  -0.79, lng: 113.92, conf: 'AFC' },
];

// Mock match data — June 17 2026, group stage day 7
const fallbackMatches = [
  { id: 'm01', teamA: 'bra', teamB: 'arg', venueId: 'v-nyc', group: 'A', status: 'live',     minute: 67, scoreA: 2, scoreB: 1, kickoffUtc: '2026-06-17T19:00:00Z' },
  { id: 'm02', teamA: 'ger', teamB: 'fra', venueId: 'v-dal', group: 'B', status: 'live',     minute: 23, scoreA: 0, scoreB: 0, kickoffUtc: '2026-06-17T22:00:00Z' },
  { id: 'm03', teamA: 'jpn', teamB: 'esp', venueId: 'v-la',  group: 'C', status: 'live',     minute: 82, scoreA: 1, scoreB: 2, kickoffUtc: '2026-06-17T16:00:00Z' },
  { id: 'm04', teamA: 'mex', teamB: 'ned', venueId: 'v-mxc', group: 'D', status: 'live',     minute: 45, scoreA: 1, scoreB: 1, kickoffUtc: '2026-06-17T20:00:00Z' },
  { id: 'm05', teamA: 'mar', teamB: 'eng', venueId: 'v-hou', group: 'E', status: 'upcoming', minute: null, scoreA: null, scoreB: null, kickoffUtc: '2026-06-18T01:00:00Z' },
  { id: 'm06', teamA: 'nga', teamB: 'col', venueId: 'v-sf',  group: 'F', status: 'upcoming', minute: null, scoreA: null, scoreB: null, kickoffUtc: '2026-06-18T01:00:00Z' },
  { id: 'm07', teamA: 'kor', teamB: 'por', venueId: 'v-van', group: 'G', status: 'finished', minute: 90, scoreA: 1, scoreB: 3, kickoffUtc: '2026-06-17T13:00:00Z' },
  { id: 'm08', teamA: 'usa', teamB: 'sen', venueId: 'v-atl', group: 'H', status: 'finished', minute: 90, scoreA: 3, scoreB: 2, kickoffUtc: '2026-06-17T14:00:00Z' },
];

const confFilters = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

// Lookup maps (module-level for stable reference)
// ─── Three.js helpers ────────────────────────────────────────────────────────

function latLngToVector3(lat, lng, radius) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
  );
}

function makeArcPoints(from, to) {
  const start = latLngToVector3(from.lat, from.lng, 2.57);
  const end   = latLngToVector3(to.lat,   to.lng,   2.57);
  const mid   = start.clone().add(end).normalize().multiplyScalar(3.22);
  return new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(52);
}

function makeEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width  = 2048;
  canvas.height = 1024;
  const ctx   = canvas.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0,    '#05172b');
  ocean.addColorStop(0.55, '#0b3f55');
  ocean.addColorStop(1,    '#031622');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.88;
  ctx.fillStyle   = '#27724e';
  const land = [
    [260, 260, 260, 120], [470, 400, 190, 150], [880, 230, 310, 140],
    [1030, 430, 230, 120], [1320, 310, 360, 170], [1520, 560, 220, 120],
    [1720, 720, 210, 100], [720, 690, 130, 80],   [1120, 650, 110, 80],
  ];
  land.forEach(([x, y, w, h], i) => {
    ctx.beginPath();
    for (let j = 0; j < 9; j++) {
      const a  = (j / 9) * Math.PI * 2;
      const px = x + Math.cos(a) * w * (0.42 + ((j + i) % 3) * 0.05);
      const py = y + Math.sin(a) * h * (0.42 + ((j + 1) % 3) * 0.07);
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  for (let x = 0; x <= canvas.width;  x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 128; y < canvas.height; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function formatKickoff(value) {
  if (!value) return 'TBD';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function formatFreshness(value) {
  if (!value) return 'embedded demo';
  return `updated ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))}`;
}

// ─── GlobeScene ──────────────────────────────────────────────────────────────
//
// Scene is created ONCE. All dynamic state (selection, filter) is read
// from refs each animation frame — avoids full Three.js teardown on every click.

function GlobeScene({ selectedMatchId, onSelectMatch, confFilter, teams, matches, hostCities }) {
  const mountRef       = useRef(null);
  const sceneRef       = useRef(null);
  const selectedRef    = useRef(selectedMatchId);
  const confFilterRef  = useRef(confFilter);
  const onSelectRef    = useRef(onSelectMatch);

  useEffect(() => { selectedRef.current   = selectedMatchId; }, [selectedMatchId]);
  useEffect(() => { confFilterRef.current = confFilter;      }, [confFilter]);
  useEffect(() => { onSelectRef.current   = onSelectMatch;   }, [onSelectMatch]);

  useEffect(() => {
    const mount = mountRef.current;
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
    const venueMap = Object.fromEntries(hostCities.map(c => [c.id, c]));

    // ── Renderer / Camera / Scene ──────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog   = new THREE.Fog(0x030609, 9, 18);

    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.5, 7.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── Globe group ────────────────────────────────────────────────────────
    const globe = new THREE.Group();
    scene.add(globe);

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 96, 96),
      new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: 0.9, metalness: 0.02 }),
    ));

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.44, 96, 96),
      new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.10, side: THREE.BackSide }),
    ));

    const gridMat = new THREE.LineBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.13 });
    const grid    = new THREE.Group();
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lng = -180; lng <= 180; lng += 4) pts.push(latLngToVector3(lat, lng, 2.49));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lng = -150; lng <= 180; lng += 30) {
      const pts = [];
      for (let lat = -80; lat <= 80; lat += 4) pts.push(latLngToVector3(lat, lng, 2.49));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    globe.add(grid);

    // ── Marker groups ──────────────────────────────────────────────────────
    const teamGroup = new THREE.Group();   // 48 team-country markers
    const cityGroup = new THREE.Group();   // 16 host-city markers (gold)
    const arcGroup  = new THREE.Group();   // 2 arcs per match

    // Team markers
    teams.forEach(team => {
      const color = new THREE.Color(CONF_COLORS[team.conf]);
      const pt    = latLngToVector3(team.lat, team.lng, 2.55);

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 18, 18),
        new THREE.MeshBasicMaterial({ color }),
      );
      sphere.position.copy(pt);
      sphere.userData = { id: team.id, nodeType: 'team', conf: team.conf };

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.065, 0.095, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      );
      ring.position.copy(pt.clone().multiplyScalar(1.005));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData = { id: team.id, nodeType: 'team', isPulse: true };

      teamGroup.add(sphere, ring);
    });

    // Host-city markers (gold, larger, with spike)
    hostCities.forEach(city => {
      const color = new THREE.Color(CITY_COLOR);
      const pt    = latLngToVector3(city.lat, city.lng, 2.55);

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 20, 20),
        new THREE.MeshBasicMaterial({ color }),
      );
      sphere.position.copy(pt);
      sphere.userData = { id: city.id, nodeType: 'city' };

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.135, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      );
      ring.position.copy(pt.clone().multiplyScalar(1.005));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData = { id: city.id, nodeType: 'city', isPulse: true };

      const spike = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          pt.clone().multiplyScalar(0.97),
          pt.clone().multiplyScalar(1.19),
        ]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 }),
      );
      spike.userData = { id: city.id, nodeType: 'city' };

      cityGroup.add(sphere, ring, spike);
    });

    // Match arcs — 2 per match (each team's country → venue)
    matches.forEach(match => {
      const tA   = teamMap[match.teamA];
      const tB   = teamMap[match.teamB];
      const city = venueMap[match.venueId];
      if (!tA || !tB || !city) return;

      const baseOp = match.status === 'live' ? 0.40 : match.status === 'upcoming' ? 0.15 : 0.07;

      const arcA = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(makeArcPoints(tA, city)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(CONF_COLORS[tA.conf]), transparent: true, opacity: baseOp }),
      );
      arcA.userData = { matchId: match.id, status: match.status, baseOp };

      const arcB = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(makeArcPoints(tB, city)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(CONF_COLORS[tB.conf]), transparent: true, opacity: baseOp }),
      );
      arcB.userData = { matchId: match.id, status: match.status, baseOp };

      arcGroup.add(arcA, arcB);
    });

    globe.add(arcGroup, teamGroup, cityGroup);

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 4, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x44ccff, 14, 12);
    rim.position.set(-4, 1, -3);
    scene.add(rim);

    // ── Stars ──────────────────────────────────────────────────────────────
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(Array.from({ length: 900 }, () => (Math.random() - 0.5) * 24), 3),
      ),
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.013, transparent: true, opacity: 0.55 }),
    );
    scene.add(stars);

    // ── Interaction ────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer   = new THREE.Vector2();
    let dragging = false, lastX = 0, lastY = 0;
    let velocityX = 0.0016, velocityY = 0;

    const setPointer = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
    };

    const onDown  = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId); };
    const onMove  = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      globe.rotation.y += dx * 0.006;
      globe.rotation.x  = THREE.MathUtils.clamp(globe.rotation.x + dy * 0.004, -0.9, 0.9);
      velocityX = dx * 0.00035; velocityY = dy * 0.00018;
      lastX = e.clientX; lastY = e.clientY;
    };
    const onUp    = (e) => { dragging = false; try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {} };
    const onWheel = (e) => { e.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.004, 4.2, 9.6); };

    const onClick = (e) => {
      setPointer(e);
      raycaster.setFromCamera(pointer, camera);

      // Only test non-pulse spheres from team + city groups
      const clickables = [
        ...teamGroup.children.filter(c => !c.userData.isPulse && c.type === 'Mesh'),
        ...cityGroup.children.filter(c => !c.userData.isPulse && c.type === 'Mesh'),
      ];
      const hit = raycaster.intersectObjects(clickables, false)[0];
      if (!hit) return;

      const { id, nodeType } = hit.object.userData;
      let found;
      if (nodeType === 'team') {
        found = matches.find(m => (m.teamA === id || m.teamB === id) && m.status === 'live')
             ?? matches.find(m =>  m.teamA === id || m.teamB === id);
      } else {
        found = matches.find(m => m.venueId === id && m.status === 'live')
             ?? matches.find(m => m.venueId === id);
      }
      if (found) onSelectRef.current(found.id);
    };

    renderer.domElement.addEventListener('pointerdown',  onDown);
    renderer.domElement.addEventListener('pointermove',  onMove);
    renderer.domElement.addEventListener('pointerup',    onUp);
    renderer.domElement.addEventListener('pointerleave', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ─────────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      frame++;
      const selId = selectedRef.current;
      const conf  = confFilterRef.current;
      const selMatch = selId ? matches.find(m => m.id === selId) : null;
      const activeTeams = selMatch ? new Set([selMatch.teamA, selMatch.teamB]) : new Set();
      const activeVenue = selMatch?.venueId ?? null;

      if (!dragging) {
        globe.rotation.y += velocityX;
        globe.rotation.x += velocityY;
        velocityX *= 0.996;
        velocityY *= 0.993;
        if (Math.abs(velocityX) < 0.0014) velocityX = 0.0014;
      }

      // Team markers
      teamGroup.children.forEach(child => {
        const { id, conf: teamConf, isPulse } = child.userData;
        const show = conf === 'All' || teamConf === conf;
        child.visible = show;
        if (!child.material || !show) return;
        const active = activeTeams.has(id);
        if (isPulse) {
          child.material.opacity = active
            ? 0.82 + Math.sin(frame * 0.10) * 0.18
            : 0.28 + Math.sin(frame * 0.032) * 0.08;
          child.scale.setScalar(active
            ? 1.55 + Math.sin(frame * 0.09) * 0.22
            : 1.00 + Math.sin(frame * 0.028) * 0.08);
        } else {
          child.material.opacity = active ? 1.0 : 0.68;
        }
      });

      // Host-city markers (always visible)
      cityGroup.children.forEach(child => {
        const { id, isPulse } = child.userData;
        if (!child.material) return;
        const active = id === activeVenue;
        if (isPulse) {
          child.material.opacity = active
            ? 0.88 + Math.sin(frame * 0.08) * 0.12
            : 0.38 + Math.sin(frame * 0.038) * 0.10;
          child.scale.setScalar(active
            ? 1.65 + Math.sin(frame * 0.08) * 0.28
            : 1.05 + Math.sin(frame * 0.03) * 0.08);
        } else {
          child.material.opacity = active ? 1.0 : 0.82;
        }
      });

      // Match arcs
      arcGroup.children.forEach(child => {
        const { matchId, status, baseOp } = child.userData;
        const isSelected = matchId === selId;
        if (!child.material) return;
        child.material.opacity = isSelected
          ? (status === 'live' ? 0.72 + Math.sin(frame * 0.055) * 0.18 : 0.48)
          : baseOp + (status === 'live' ? Math.sin(frame * 0.022) * 0.06 : 0);
      });

      stars.rotation.y += 0.00022;
      renderer.render(scene, camera);
      sceneRef.current.raf = requestAnimationFrame(animate);
    };

    sceneRef.current = { renderer, raf: requestAnimationFrame(animate) };

    return () => {
      cancelAnimationFrame(sceneRef.current.raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown',  onDown);
      renderer.domElement.removeEventListener('pointermove',  onMove);
      renderer.domElement.removeEventListener('pointerup',    onUp);
      renderer.domElement.removeEventListener('pointerleave', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [teams, matches, hostCities]);

  return <div className="globe-canvas" ref={mountRef} aria-label="FIFA World Cup 2026 match monitor" />;
}

// ─── MatchRow ─────────────────────────────────────────────────────────────────

function MatchRow({ match, selected, onSelect, teamMap, venueMap }) {
  const tA = teamMap[match.teamA];
  const tB = teamMap[match.teamB];
  const city = venueMap[match.venueId];
  return (
    <button
      className={`match-row match-row--${match.status}${selected ? ' selected' : ''}`}
      onClick={() => onSelect(match.id)}
      type="button"
    >
      <div className="match-teams">
        <span className="match-team-name">{tA?.flag} {tA?.name}</span>
        <span className="match-score-inline">
          {match.status !== 'upcoming'
            ? `${match.scoreA} – ${match.scoreB}`
            : formatKickoff(match.kickoffUtc)}
        </span>
        <span className="match-team-name right">{tB?.name} {tB?.flag}</span>
      </div>
      <div className="match-meta">
        <span className={`match-dot match-dot--${match.status}`} />
        <span>
          {city?.city ?? match.venueId} · Grp {match.group}
          {match.status === 'live' ? ` · ${match.minute}'` : ''}
        </span>
      </div>
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { matches, teams, loading, error, lastUpdated, source } = useMatches({
    fallbackMatches,
    fallbackTeams,
    hostCities,
  });
  const [selectedMatchId, setSelectedMatchId] = useState(fallbackMatches[0].id);
  const [confFilter,      setConfFilter]       = useState('All');
  const [query,           setQuery]            = useState('');
  const [autoTour,        setAutoTour]         = useState(true);

  const teamMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const venueMap = useMemo(() => Object.fromEntries(hostCities.map(c => [c.id, c])), []);
  const selectedMatch = matches.find(m => m.id === selectedMatchId) ?? matches[0];
  const tA    = selectedMatch ? teamMap[selectedMatch.teamA]  : null;
  const tB    = selectedMatch ? teamMap[selectedMatch.teamB]  : null;
  const venue = selectedMatch ? venueMap[selectedMatch.venueId] : null;

  const liveCount     = matches.filter(m => m.status === 'live').length;
  const upcomingCount = matches.filter(m => m.status === 'upcoming').length;

  useEffect(() => {
    if (matches.length && !matches.some(match => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  const visibleMatches = useMemo(() => {
    const q = query.toLowerCase();
    return matches.filter(m => {
      const a = teamMap[m.teamA], b = teamMap[m.teamB], v = venueMap[m.venueId];
      const confOk  = confFilter === 'All' || a?.conf === confFilter || b?.conf === confFilter;
      const queryOk = !q || `${a?.name} ${b?.name} ${v?.city}`.toLowerCase().includes(q);
      return confOk && queryOk;
    });
  }, [confFilter, query]);

  // Auto-tour: live → upcoming → finished
  useEffect(() => {
    if (!autoTour || query) return;
    const pool = [
      ...matches.filter(m => m.status === 'live'),
      ...matches.filter(m => m.status === 'upcoming'),
      ...matches.filter(m => m.status === 'finished'),
    ];
    if (!pool.length) return;
    const timer = setInterval(() => {
      setSelectedMatchId(cur => {
        const idx = pool.findIndex(m => m.id === cur);
        return pool[(idx + 1) % pool.length].id;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [autoTour, query]);

  const liveMatches     = visibleMatches.filter(m => m.status === 'live');
  const upcomingMatches = visibleMatches.filter(m => m.status === 'upcoming');
  const finishedMatches = visibleMatches.filter(m => m.status === 'finished');

  return (
    <main className="app-shell">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <section className="control-panel" aria-label="FIFA World Cup 2026 controls">
        <div className="brand-lockup">
          <div className="brand-mark">⚽</div>
          <div>
            <p className="eyebrow">FIFA WORLD CUP 2026</p>
            <h1>Match Monitor</h1>
          </div>
        </div>

        <div className="metric-row">
          <div>
            <strong className="live-num">{liveCount}</strong>
            <span>live now</span>
          </div>
          <div>
            <strong>{upcomingCount}</strong>
            <span>upcoming today</span>
          </div>
        </div>

        <button className="tour-toggle" onClick={() => setAutoTour(v => !v)} type="button">
          {autoTour ? <Pause size={16} /> : <Play size={16} />}
          {autoTour ? 'Pause auto tour' : 'Resume auto tour'}
        </button>

        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search team or city"
          />
        </label>

        <div className="filter-strip" aria-label="Confederation filter">
          {confFilters.map(f => (
            <button
              key={f}
              className={f === confFilter ? 'active' : ''}
              onClick={() => setConfFilter(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>

        <div className="interaction-guide">
          <span><Rotate3D size={16} /> drag to rotate</span>
          <span><ZoomIn size={16} /> scroll to zoom</span>
          <span><MousePointer2 size={16} /> click marker</span>
        </div>

        <div className="match-list">
          {liveMatches.length > 0 && (
            <>
              <p className="list-label">⬤ LIVE</p>
              {liveMatches.map(m => (
                <MatchRow key={m.id} match={m} selected={m.id === selectedMatchId} onSelect={setSelectedMatchId} teamMap={teamMap} venueMap={venueMap} />
              ))}
            </>
          )}
          {upcomingMatches.length > 0 && (
            <>
              <p className="list-label">◷ UPCOMING</p>
              {upcomingMatches.map(m => (
                <MatchRow key={m.id} match={m} selected={m.id === selectedMatchId} onSelect={setSelectedMatchId} teamMap={teamMap} venueMap={venueMap} />
              ))}
            </>
          )}
          {finishedMatches.length > 0 && (
            <>
              <p className="list-label">✓ FINISHED</p>
              {finishedMatches.map(m => (
                <MatchRow key={m.id} match={m} selected={m.id === selectedMatchId} onSelect={setSelectedMatchId} teamMap={teamMap} venueMap={venueMap} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── Globe stage ────────────────────────────────────────────────── */}
      <section className="stage">
        <div className="top-bar">
          <div>
            <p className="eyebrow">LIVE VISUALIZATION · {formatFreshness(lastUpdated)}</p>
            <h2>World Cup 2026 · {source}</h2>
          </div>
          <div className="status-pill">
            <Globe2 size={17} />
            WebGL active
          </div>
        </div>

        <GlobeScene
          selectedMatchId={selectedMatchId}
          onSelectMatch={setSelectedMatchId}
          confFilter={confFilter}
          teams={teams}
          matches={matches}
          hostCities={hostCities}
        />

        {loading && <div className="data-loading">Loading match feed...</div>}
        {error && <div className="data-error" role="status">{error}</div>}

        {selectedMatch && tA && tB && venue && (
          <article className="detail-panel">
            {/* Score board */}
            <div className="score-board">
              <div className="score-team">
                <span className="flag-lg">{tA.flag}</span>
                <span className="team-nm">{tA.name}</span>
              </div>
              <div className="score-center">
                {selectedMatch.status !== 'upcoming'
                  ? <span className="score-digits">{selectedMatch.scoreA} – {selectedMatch.scoreB}</span>
                  : <span className="score-vs">vs</span>}
                <span className={`status-badge status-${selectedMatch.status}`}>
                  {selectedMatch.status === 'live'     && `LIVE ${selectedMatch.minute}'`}
                  {selectedMatch.status === 'upcoming' && formatKickoff(selectedMatch.kickoffUtc)}
                  {selectedMatch.status === 'finished' && 'FT'}
                </span>
              </div>
              <div className="score-team score-team--r">
                <span className="flag-lg">{tB.flag}</span>
                <span className="team-nm">{tB.name}</span>
              </div>
            </div>

            {/* Venue + group */}
            <div className="detail-grid">
              <div>
                <MapPin size={17} />
                <span>{venue.city} · {venue.stadium}</span>
              </div>
              <div>
                <Trophy size={17} />
                <span>Group {selectedMatch.group} · {venue.country}</span>
              </div>
            </div>

            {/* Confederation tags */}
            <div className="conf-tags">
              {[tA, tB].map(t => (
                <span
                  key={t.id}
                  style={{
                    background:  `${CONF_COLORS[t.conf]}22`,
                    borderColor: `${CONF_COLORS[t.conf]}66`,
                    color:        CONF_COLORS[t.conf],
                  }}
                >
                  {t.conf} · {t.name}
                </span>
              ))}
            </div>

            <p className="source-note">
              Source: {source} · {formatFreshness(lastUpdated)}
            </p>
          </article>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
