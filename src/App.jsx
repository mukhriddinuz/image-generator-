import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Crosshair, Image as ImageIcon } from 'lucide-react';
import './index.css';

function App() {
  const [image, setImage] = useState(null);
  const [logo, setLogo] = useState('/logo.png'); // Default logo
  const [fabricImage, setFabricImage] = useState(null);
  const loadSavedTemplate = () => {
    try {
      const saved = localStorage.getItem('milana_saved_template');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load template", e);
    }
    return null;
  };

  const savedState = loadSavedTemplate();

  const [data, setData] = useState(savedState?.data || {
    badgeTitle: 'Штапель',
    badgeSubtitle: '100% Viscose',
    modelLabel: 'MODEL',
    modelValue: 'TJ-2045',
    codeLabel: 'CODE',
    codeValue: 'V-4548',
  });
  
  // Sizes that will be displayed
  const [customSizesText, setCustomSizesText] = useState(savedState?.customSizesText || '46, 48, 50, 52, 54');
  const selectedSizes = customSizesText.split(',').map(s => s.trim()).filter(s => s);
  const [sizesMode, setSizesMode] = useState(savedState?.sizesMode || 'list'); // 'list' or 'badge'
  const [freeSizeText, setFreeSizeText] = useState(savedState?.freeSizeText || 'Free size');
  const [freeSizeHasBorder, setFreeSizeHasBorder] = useState(savedState?.freeSizeHasBorder ?? false);
  const [badgeHasBorder, setBadgeHasBorder] = useState(savedState?.badgeHasBorder ?? true);
  const borderWidth = 16;

  // Magnifier state
  const [magnifierPoint, setMagnifierPoint] = useState(savedState?.magnifierPoint || {x: 65, y: 75});
  const [showMagnifier, setShowMagnifier] = useState(savedState?.showMagnifier ?? true);
  const [isPicking, setIsPicking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.25);

  // Layout settings
  const [activeTab, setActiveTab] = useState('content');
  const [positions, setPositions] = useState(savedState?.positions || {
    logo: { x: 3, y: 3, scale: 20 },
    badge: { x: 3, y: 15 },
    modelCode: { x: 5, y: 53 },
    sizes: { x: 5, y: 64 },
    magnifier: { x: 74, y: 76 }
  });

  // Drag and drop state
  const [draggingElement, setDraggingElement] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initX: 0, initY: 0 });

  // Resize state
  const [resizingElement, setResizingElement] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, initScale: 1 });

  // Canva Editor state
  const [selectedElement, setSelectedElement] = useState(null);
  const [elementStyles, setElementStyles] = useState(savedState?.elementStyles || {
    logo: { opacity: 1 },
    badge: { 
      opacity: 1, 
      scale: 1, 
      topBg: '#e6ded7', 
      bottomBg: '#b09a8f', 
      titleColor: '#1a1a1a', 
      subtitleColor: '#1a1a1a', 
      borderColor: 'rgba(255, 255, 255, 0.9)' 
    },
    modelCode: { 
      opacity: 1, 
      scale: 1.1, 
      borderColor: '#1a1a1a', 
      textColor: '#1a1a1a' 
    },
    sizes: {
      opacity: 1,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      bgColor: '#ebe4dc',
      textColor: '#1a1a1a',
      borderColor: '#1a1a1a'
    },
    magnifier: {
      opacity: 1,
      scale: 0.9,
      borderColor: '#ffffff'
    }
  });

  const saveTemplate = () => {
    const template = {
      data, customSizesText, sizesMode, freeSizeText, freeSizeHasBorder, badgeHasBorder, positions, elementStyles, magnifierPoint, showMagnifier, borderWidth
    };
    localStorage.setItem('milana_saved_template', JSON.stringify(template));
    alert("Shablon muvaffaqiyatli saqlandi! Endi sahifaga har kirganingizda barcha elementlar va matnlar aynan shu holatda joylashib turadi.");
  };

  const updateStyle = (element, property, value) => {
    setElementStyles(prev => ({
      ...prev,
      [element]: {
        ...prev[element],
        [property]: value
      }
    }));
  };

  const handleElementClick = (e, id) => {
    e.stopPropagation();
    setSelectedElement(id);
    setActiveTab('design');
  };

  const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const exportRef = useRef(null);

  const updateContainerWidth = useCallback(() => {
    if (canvasRef.current && imageRef.current) {
      // Use the image width to define cqw (1cqw = 1% of image width)
      const rect = imageRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      canvasRef.current.style.setProperty('--cw', `${width}px`);
      canvasRef.current.style.setProperty('--cqw', `${width / 100}px`);
      if (width > 0) setAspectRatio(height / width);
    }
  }, []);

  useEffect(() => {
    if (!imageRef.current) return;
    const observer = new ResizeObserver(() => updateContainerWidth());
    observer.observe(imageRef.current);
    
    // Also run once immediately when image loads
    imageRef.current.addEventListener('load', updateContainerWidth);
    return () => {
      observer.disconnect();
      if (imageRef.current) {
        imageRef.current.removeEventListener('load', updateContainerWidth);
      }
    };
  }, [image, updateContainerWidth]);

  // Drag handlers
  const handlePointerDown = (e, id) => {
    if (isPicking) return;
    e.stopPropagation();
    setSelectedElement(id);
    setActiveTab('design');
    setDraggingElement(id);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initX: parseFloat(positions[id].x),
      initY: parseFloat(positions[id].y)
    });
    document.body.style.userSelect = 'none';
  };

  const handleResizeDown = (e, id, direction = 'corner') => {
    e.stopPropagation();
    setResizingElement({ id, direction });
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      initScale: parseFloat(id === 'logo' ? positions.logo.scale : (elementStyles[id].scale || 1)),
      initScaleX: parseFloat(id === 'logo' ? 1 : (elementStyles[id].scaleX || 1)),
      initScaleY: parseFloat(id === 'logo' ? 1 : (elementStyles[id].scaleY || 1))
    });
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = useCallback((e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const cqwPixelValue = rect.width / 100;
    
    if (draggingElement) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const newX = dragStart.initX + (dx / cqwPixelValue);
      const newY = dragStart.initY + (dy / cqwPixelValue);
      
      setPositions(prev => ({
        ...prev,
        [draggingElement]: {
          ...prev[draggingElement],
          x: Math.max(-20, Math.min(120, newX)),
          y: Math.max(-20, Math.min(150, newY))
        }
      }));
    } else if (resizingElement) {
      const { id, direction } = resizingElement;
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      
      if (id === 'logo') {
        const scaleChange = dx / cqwPixelValue * 2;
        setPositions(prev => ({
          ...prev,
          logo: { ...prev.logo, scale: Math.max(10, Math.min(80, resizeStart.initScale + scaleChange)) }
        }));
      } else {
        const scaleChangeX = dx / (cqwPixelValue * 10);
        const scaleChangeY = dy / (cqwPixelValue * 10);
        
        if (direction === 'corner') {
          updateStyle(id, 'scale', Math.max(0.5, Math.min(3, resizeStart.initScale + scaleChangeX)));
        } else if (direction === 'horizontal') {
          updateStyle(id, 'scaleX', Math.max(0.5, Math.min(4, resizeStart.initScaleX + scaleChangeX)));
        } else if (direction === 'vertical') {
          updateStyle(id, 'scaleY', Math.max(0.5, Math.min(4, resizeStart.initScaleY + scaleChangeY)));
        }
      }
    }
  }, [draggingElement, dragStart, resizingElement, resizeStart]);

  const handlePointerUp = useCallback(() => {
    if (draggingElement || resizingElement) {
      setDraggingElement(null);
      setResizingElement(null);
      document.body.style.userSelect = 'auto';
    }
  }, [draggingElement, resizingElement]);

  useEffect(() => {
    if (draggingElement || resizingElement) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [draggingElement, resizingElement, handlePointerMove, handlePointerUp]);


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogo(url);
    }
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleCanvasClick = (e) => {
    // Only deselect if clicked directly on the image or canvas background
    if (e.target.classList && (e.target.classList.contains('canvas-wrapper') || e.target.classList.contains('main-image') || e.target.classList.contains('overlay-layer'))) {
      setSelectedElement(null);
    }
    
    if (!isPicking || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMagnifierPoint({ x, y });
    setIsPicking(false);
  };

  const exportImage = useCallback(async () => {
    if (!imageRef.current) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;

      const img = imageRef.current;
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const cqw = W / 100;
      const bpx = Math.round(borderWidth * W / img.getBoundingClientRect().width);

      const canvas = document.createElement('canvas');
      canvas.width = W + bpx * 2;
      canvas.height = H + bpx * 2;
      const ctx = canvas.getContext('2d');

      // White border background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Original image (full resolution)
      ctx.drawImage(img, bpx, bpx, W, H);

      // cqw coord → canvas pixel
      const cx = n => bpx + n * cqw;

      const loadImg = src => new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });

      // ── LOGO ────────────────────────────────────────────
      if (logo) {
        try {
          const lImg = await loadImg(logo);
          const lw = positions.logo.scale * cqw;
          const lh = lImg.naturalWidth > 0 ? lw * lImg.naturalHeight / lImg.naturalWidth : lw * 0.4;
          ctx.globalAlpha = Number(elementStyles.logo.opacity) || 1;
          ctx.drawImage(lImg, cx(positions.logo.x), cx(positions.logo.y), lw, lh);
          ctx.globalAlpha = 1;
        } catch (e) { /* logo yuklanmasa o'tkazib yuborish */ }
      }

      // ── BADGE ───────────────────────────────────────────
      {
        const bs = Number(elementStyles.badge.scale) || 1;
        const bx = cx(positions.badge.x);
        const by = cx(positions.badge.y);
        const badgeW = 18 * cqw * bs;
        const op = Number(elementStyles.badge.opacity) || 1;
        const titleSize = 3 * cqw * bs;
        const subtitleSize = 1.1 * cqw * bs;
        const tPad = 0.8 * cqw * bs;
        const bPad = 0.4 * cqw * bs;
        const blw = 0.15 * cqw;
        const radius = 1.5 * cqw * bs;
        const titleLines = data.badgeTitle.split('\n');
        const subtitleLines = data.badgeSubtitle.split('\n');
        const topH = tPad + titleLines.length * titleSize * 1.15 + tPad * 0.75;
        const botH = bPad + subtitleLines.length * subtitleSize * 1.2 + bPad;
        const totalH = topH + botH;

        // Draw with rounded corners using clip
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, totalH, radius);
        ctx.clip();

        ctx.fillStyle = hexToRgba(elementStyles.badge.topBg, op);
        ctx.fillRect(bx, by, badgeW, topH);
        ctx.fillStyle = hexToRgba(elementStyles.badge.bottomBg, op);
        ctx.fillRect(bx, by + topH, badgeW, botH);

        ctx.restore();

        if (badgeHasBorder) {
          ctx.strokeStyle = elementStyles.badge.borderColor;
          ctx.lineWidth = blw;
          ctx.beginPath();
          ctx.roundRect(bx + blw / 2, by + blw / 2, badgeW - blw, totalH - blw, radius);
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by + topH); ctx.lineTo(bx + badgeW, by + topH); ctx.stroke();
        }

        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = elementStyles.badge.titleColor;
        ctx.font = `800 ${titleSize}px Inter, sans-serif`;
        titleLines.forEach((line, i) => ctx.fillText(line, bx + badgeW / 2, by + tPad + i * titleSize * 1.15));

        ctx.fillStyle = elementStyles.badge.subtitleColor;
        ctx.font = `800 ${subtitleSize}px Inter, sans-serif`;
        subtitleLines.forEach((line, i) => ctx.fillText(line, bx + badgeW / 2, by + topH + bPad + i * subtitleSize * 1.2));
      }

      // ── MODEL / CODE ─────────────────────────────────────
      {
        const ms = Number(elementStyles.modelCode.scale) || 1;
        const mx = cx(positions.modelCode.x);
        const my = cx(positions.modelCode.y);
        const color = elementStyles.modelCode.textColor || '#1a1a1a';
        const lw = 0.15 * cqw * ms;
        const cornerH = 1.0 * cqw * ms;
        const labelSize = 2.2 * cqw * ms;
        const valueSize = 5 * cqw * ms;
        const lPad = 0.5 * cqw * ms;

        ctx.fillStyle = color;

        // Measure texts to determine bracket width
        ctx.font = `600 ${valueSize}px Oswald, sans-serif`;
        const valW = ctx.measureText(data.modelValue).width;
        ctx.font = `500 ${labelSize}px Oswald, sans-serif`;
        const labW = ctx.measureText(data.modelLabel).width;
        // Bracket width matches value width (like CSS 100% - 10cqw of overlay)
        const bracketW = valW - 2 * cqw * ms;
        const cenX = mx + bracketW / 2;

        // ── Top bracket: horizontal line + label row ──────
        // Label row height ≈ labelSize * 1.1 (same as CSS flex row)
        const labelRowH = labelSize * 1.1;
        const topLineY = my + labelRowH / 2 - lw / 2; // center of row

        // Left and right corners: start at line center, go DOWN
        ctx.fillRect(mx, topLineY, lw, cornerH);
        ctx.fillRect(mx + bracketW - lw, topLineY, lw, cornerH);

        // Horizontal lines (gap in the middle for label)
        const halfLineW = (bracketW - labW - lPad * 2 - lw * 2) / 2;
        ctx.fillRect(mx + lw, topLineY, halfLineW, lw);
        ctx.fillRect(mx + lw + halfLineW + labW + lPad * 2, topLineY, halfLineW, lw);

        // Label text centered in row
        ctx.font = `500 ${labelSize}px Oswald, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(data.modelLabel, cenX, my + labelRowH / 2);

        // ── Model value ───────────────────────────────────
        const valY = my + labelRowH;
        ctx.font = `600 ${valueSize}px Oswald, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(data.modelValue, cenX, valY);
        const valH = valueSize * 1.0;

        // ── Bottom bracket: corners go UP, line at bottom ─
        const botBracketY = valY + valH;
        const botLineY = botBracketY + cornerH - lw; // line at bottom

        ctx.fillRect(mx, botBracketY, lw, cornerH);
        ctx.fillRect(mx + bracketW - lw, botBracketY, lw, cornerH);
        ctx.fillRect(mx, botLineY, bracketW, lw);

        // ── Code section ──────────────────────────────────
        const codeY = botBracketY + cornerH + 1.5 * cqw * ms;
        ctx.font = `500 ${labelSize}px Oswald, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(data.codeLabel, cenX, codeY);
        ctx.font = `600 ${valueSize}px Oswald, sans-serif`;
        ctx.fillText(data.codeValue, cenX, codeY + labelSize * 1.1);
      }

      // ── SIZES ────────────────────────────────────────────
      if (sizesMode === 'list' && selectedSizes.length > 0) {
        const sxS = Number(elementStyles.sizes.scaleX) || 1;
        const syS = Number(elementStyles.sizes.scaleY) || 1;
        const op = Number(elementStyles.sizes.opacity) || 1;
        const sX = cx(positions.sizes.x);
        const sY = cx(positions.sizes.y);
        const itemH = 3.5 * cqw * syS;
        const boxW = 3.5 * cqw * sxS;
        const gap = 0.5 * cqw;
        const padX = 1.5 * cqw;
        const padY = 1.0 * cqw;
        const tSize = 2.2 * cqw;
        const blw = 0.15 * cqw;
        ctx.font = `700 ${tSize}px Inter, sans-serif`;
        const maxTW = Math.max(...selectedSizes.map(s => ctx.measureText(s).width));
        const contW = padX + boxW + 0.3 * cqw + maxTW + padX;
        const contH = padY * 2 + selectedSizes.length * itemH + (selectedSizes.length - 1) * gap;

        ctx.fillStyle = hexToRgba(elementStyles.sizes.bgColor, op);
        ctx.fillRect(sX, sY, contW, contH);

        selectedSizes.forEach((size, i) => {
          const iy = sY + padY + i * (itemH + gap);
          const ix = sX + padX;
          ctx.strokeStyle = elementStyles.sizes.borderColor;
          ctx.lineWidth = blw;
          // 3-sided box (open right)
          ctx.beginPath();
          ctx.moveTo(ix + boxW, iy); ctx.lineTo(ix, iy); ctx.lineTo(ix, iy + itemH); ctx.lineTo(ix + boxW, iy + itemH);
          ctx.stroke();
          // Partial right connectors (top 25%, bottom 25%)
          const conn = itemH * 0.25;
          ctx.beginPath(); ctx.moveTo(ix + boxW, iy); ctx.lineTo(ix + boxW, iy + conn); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ix + boxW, iy + itemH - conn); ctx.lineTo(ix + boxW, iy + itemH); ctx.stroke();

          ctx.fillStyle = elementStyles.sizes.textColor;
          ctx.font = `700 ${tSize}px Inter, sans-serif`;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(size, ix + boxW + 0.3 * cqw, iy + itemH / 2);
        });

      } else if (sizesMode === 'badge') {
        const sxS = Number(elementStyles.sizes.scaleX) || 1;
        const syS = Number(elementStyles.sizes.scaleY) || 1;
        const op = Number(elementStyles.sizes.opacity) || 1;
        const fsX = cx(positions.sizes.x);
        const fsY = cx(positions.sizes.y);
        const tSize = 2 * cqw;
        ctx.font = `700 ${tSize}px Inter, sans-serif`;
        const lines = freeSizeText.split('\n');
        const maxLW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const pX = 4 * cqw * sxS;
        const pY = 1.5 * cqw * syS;
        const lh = tSize * 1.2;
        const bW = maxLW + pX * 2;
        const bH = lines.length * lh + pY * 2;
        ctx.fillStyle = hexToRgba(elementStyles.sizes.bgColor, op);
        ctx.fillRect(fsX, fsY, bW, bH);
        if (freeSizeHasBorder) {
          ctx.strokeStyle = elementStyles.sizes.borderColor;
          ctx.lineWidth = 0.2 * cqw;
          ctx.strokeRect(fsX, fsY, bW, bH);
        }
        ctx.fillStyle = elementStyles.sizes.textColor;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        lines.forEach((line, i) => ctx.fillText(line, fsX + bW / 2, fsY + pY + i * lh));
      }

      // ── MAGNIFIER ────────────────────────────────────────
      if (showMagnifier && (magnifierPoint || fabricImage)) {
        const mScale = Number(elementStyles.magnifier.scale) || 1;
        const mDiam = 24 * cqw * mScale;
        const mR = mDiam / 2;
        const mCx = bpx + positions.magnifier.x * cqw + mR;
        const mCy = bpx + positions.magnifier.y * cqw + mR;
        const bColor = elementStyles.magnifier.borderColor || '#ffffff';
        const blw = 0.2 * cqw;

        if (magnifierPoint) {
          const ptX = bpx + magnifierPoint.x / 100 * W;
          const ptY = bpx + magnifierPoint.y / 100 * H;
          ctx.strokeStyle = bColor; ctx.lineWidth = blw;
          ctx.beginPath(); ctx.moveTo(ptX, ptY); ctx.lineTo(mCx, mCy); ctx.stroke();
          ctx.fillStyle = bColor;
          ctx.beginPath(); ctx.arc(ptX, ptY, 0.5 * cqw, 0, Math.PI * 2); ctx.fill();
        }

        ctx.save();
        ctx.beginPath(); ctx.arc(mCx, mCy, mR - blw, 0, Math.PI * 2); ctx.clip();
        if (fabricImage) {
          try {
            const fImg = await loadImg(fabricImage);
            ctx.drawImage(fImg, mCx - mR, mCy - mR, mDiam, mDiam);
          } catch (e) {}
        } else if (magnifierPoint) {
          const zoom = 3;
          const srcW = W / zoom; const srcH = H / zoom;
          const srcX = Math.max(0, Math.min(magnifierPoint.x / 100 * W - srcW / 2, W - srcW));
          const srcY = Math.max(0, Math.min(magnifierPoint.y / 100 * H - srcH / 2, H - srcH));
          ctx.drawImage(img, srcX, srcY, srcW, srcH, mCx - mR, mCy - mR, mDiam, mDiam);
        }
        ctx.restore();

        ctx.strokeStyle = bColor; ctx.lineWidth = blw;
        ctx.beginPath(); ctx.arc(mCx, mCy, mR - blw / 2, 0, Math.PI * 2); ctx.stroke();
      }

      // ── EXPORT ──────────────────────────────────────────
      await new Promise(resolve => {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = `milana-presentation-${Date.now()}.jpg`;
          a.href = url;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, 'image/jpeg', 0.95);
      });

    } catch (err) {
      console.error('Export failed:', err);
      alert('Export muvaffaqiyatsiz tugadi');
    } finally {
      setIsExporting(false);
    }
  }, [image, logo, fabricImage, positions, elementStyles, data, selectedSizes, sizesMode,
      freeSizeText, freeSizeHasBorder, badgeHasBorder, magnifierPoint, showMagnifier,
      borderWidth, hexToRgba, imageRef]);

  // Calculate background position for magnifier
  const getMagnifierStyle = () => {
    if (!image || !magnifierPoint) return {};
    
    // Zoom factor
    const zoom = 3;
    
    // We want the clicked point to be in the center of the magnifier
    // backgroundSize is zoom * 100%
    const bgSize = `${zoom * 100}%`;
    
    // The background position X and Y.
    // To center the point (x, y) with zoom Z:
    // pos = (x * Z - 50) / (Z - 1)
    // Actually, simple percentage positioning:
    // If background-size is > 100%, background-position: X% Y% will align the X% of the image with the X% of the container.
    // So if we set backgroundPosition: `${magnifierPoint.x}% ${magnifierPoint.y}%`, the clicked point will be exactly in the center!
    // This works perfectly in CSS.
    
    return {
      backgroundImage: `url(${image})`,
      backgroundSize: bgSize,
      backgroundPosition: `${magnifierPoint.x}% ${magnifierPoint.y}%`,
    };
  };

  return (
    <div className="app-container">
      {/* Sidebar Editor */}
      <div className="editor-sidebar">
        <div className="editor-header">
          <h1 className="editor-title">Milana Premium</h1>
          <p className="editor-subtitle">Product Presentation Generator</p>
        </div>

        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid #333' }}>
          <button 
            onClick={() => setActiveTab('content')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === 'content' ? 'var(--accent)' : '#888', cursor: 'pointer', borderBottom: activeTab === 'content' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: 600, transition: 'all 0.2s' }}
          >
            MA'LUMOTLAR
          </button>
          <button 
            onClick={() => setActiveTab('design')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === 'design' ? 'var(--accent)' : '#888', cursor: 'pointer', borderBottom: activeTab === 'design' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: 600, transition: 'all 0.2s' }}
          >
            DIZAYN
          </button>
        </div>

        {activeTab === 'design' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            {!selectedElement ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '8px' }}>
                <Crosshair size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p>Rasm ustidagi biror elementni bosing (Nishon, Logo...)</p>
              </div>
            ) : (
              <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: '14px', textTransform: 'uppercase' }}>
                  {selectedElement === 'logo' && 'Logo Sozlamalari'}
                  {selectedElement === 'badge' && 'Nishon Sozlamalari'}
                  {selectedElement === 'modelCode' && 'Model va Kod Sozlamalari'}
                  {selectedElement === 'sizes' && 'Razmerlar Sozlamalari'}
                </h3>
                
                {/* Opacity Control - Common to all */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px'}}>Shaffoflik (Opacity)</span>
                  <input type="range" min="0" max="1" step="0.05" value={elementStyles[selectedElement].opacity} onChange={(e) => updateStyle(selectedElement, 'opacity', e.target.value)} style={{width: '100%'}}/>
                </div>

                {/* Scale Control - Common to all */}
                {selectedElement === 'logo' ? (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px'}}>Kattaligi (Umumiy Scale)</span>
                    <input type="range" min="10" max="80" step="1" value={positions.logo.scale} onChange={(e) => setPositions({...positions, logo: {...positions.logo, scale: e.target.value}})} style={{width: '100%'}}/>
                  </div>
                ) : selectedElement === 'sizes' ? (
                  <div style={{ marginBottom: '16px', padding: '10px', background: '#111', borderRadius: '6px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    ← O'ng uchidan tort: kenglik<br/>↓ Pastki uchidan tort: balandlik
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px'}}>Kattaligi (Umumiy)</span>
                      <input type="range" min="0.5" max="2" step="0.05" value={elementStyles[selectedElement].scale} onChange={(e) => updateStyle(selectedElement, 'scale', e.target.value)} style={{width: '100%'}}/>
                    </div>
                  </div>
                )}

                {/* Colors for Badge */}
                {selectedElement === 'badge' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Tepa Fon</span>
                      <input type="color" value={elementStyles.badge.topBg} onChange={(e) => updateStyle('badge', 'topBg', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Past Fon</span>
                      <input type="color" value={elementStyles.badge.bottomBg} onChange={(e) => updateStyle('badge', 'bottomBg', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Sarlavha Rangi</span>
                      <input type="color" value={elementStyles.badge.titleColor} onChange={(e) => updateStyle('badge', 'titleColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Quyi Matn Rangi</span>
                      <input type="color" value={elementStyles.badge.subtitleColor} onChange={(e) => updateStyle('badge', 'subtitleColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                  </div>
                )}

                {/* Colors for Model Code */}
                {selectedElement === 'modelCode' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Matn Rangi</span>
                      <input type="color" value={elementStyles.modelCode.textColor} onChange={(e) => updateStyle('modelCode', 'textColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Chiziq Rangi</span>
                      <input type="color" value={elementStyles.modelCode.borderColor} onChange={(e) => updateStyle('modelCode', 'borderColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                  </div>
                )}

                {/* Colors for Sizes */}
                {selectedElement === 'sizes' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Asosiy Fon</span>
                      <input type="color" value={elementStyles.sizes.bgColor} onChange={(e) => updateStyle('sizes', 'bgColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Matn Rangi</span>
                      <input type="color" value={elementStyles.sizes.textColor} onChange={(e) => updateStyle('sizes', 'textColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                    <div>
                      <span style={{fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px'}}>Quti Rangi</span>
                      <input type="color" value={elementStyles.sizes.borderColor} onChange={(e) => updateStyle('sizes', 'borderColor', e.target.value)} style={{width: '100%', height: '30px', cursor: 'pointer', border: 'none', padding: 0}}/>
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="input-group">
          <label>Main Image</label>
          <label className="file-upload-btn">
            <Upload size={24} />
            <span>Click to upload photo</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>

        <div className="input-group">
          <label>Logo (Optional, or uses default text)</label>
          <label className="file-upload-btn" style={{ height: '80px' }}>
            <ImageIcon size={20} />
            <span>Upload Custom Logo</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </label>
        </div>

        <div className="input-group">
          <label>Mato Namunasi (Doira)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="file-upload-btn" style={{ flex: 1, height: '70px', padding: '10px' }}>
              <Upload size={20} />
              <span style={{ fontSize: '11px', marginTop: '4px' }}>Rasm yuklash</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) setFabricImage(URL.createObjectURL(file));
              }} />
            </label>
            <button 
              onClick={() => setIsPicking(!isPicking)}
              style={{ flex: 1, background: isPicking ? 'var(--accent)' : '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <Crosshair size={20} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '11px' }}>{isPicking ? 'Rasmdan tanlang...' : 'Chiziq nishoni'}</span>
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={showMagnifier}
              onChange={e => setShowMagnifier(e.target.checked)}
            />
            Doira va chiziqni ko'rsatish
          </label>
        </div>

        <div className="input-group">
          <label>Badge Title</label>
          <textarea name="badgeTitle" value={data.badgeTitle} onChange={handleChange} style={{ resize: 'vertical', minHeight: '60px' }} />
        </div>

        <div className="input-group">
          <label>Badge Subtitle</label>
          <textarea name="badgeSubtitle" value={data.badgeSubtitle} onChange={handleChange} style={{ resize: 'vertical', minHeight: '60px' }} />
        </div>

        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={badgeHasBorder} 
              onChange={e => setBadgeHasBorder(e.target.checked)} 
            />
            Nishon qutisi chiziqlari (Ramka)
          </label>
        </div>

        <div className="input-group" style={{ flexDirection: 'row', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label>Model Prefix</label>
            <input type="text" name="modelLabel" value={data.modelLabel} onChange={handleChange} style={{ width: '100%', marginTop: '8px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Model Value</label>
            <input type="text" name="modelValue" value={data.modelValue} onChange={handleChange} style={{ width: '100%', marginTop: '8px' }} />
          </div>
        </div>

        <div className="input-group" style={{ flexDirection: 'row', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label>Code Prefix</label>
            <input type="text" name="codeLabel" value={data.codeLabel} onChange={handleChange} style={{ width: '100%', marginTop: '8px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Code Value</label>
            <input type="text" name="codeValue" value={data.codeValue} onChange={handleChange} style={{ width: '100%', marginTop: '8px' }} />
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Razmerlar Ko'rinishi</label>
            <select value={sizesMode} onChange={e => setSizesMode(e.target.value)} style={{ background: '#333', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
              <option value="list">Ro'yxat (44, 46...)</option>
              <option value="badge">Yagona Matn (Free size)</option>
            </select>
          </div>
          
          {sizesMode === 'list' ? (
            <div>
              <label style={{ fontSize: '12px', color: '#888' }}>Razmerlarni vergul bilan yozing (avto-kengayadi):</label>
              <textarea 
                value={customSizesText} 
                onChange={e => setCustomSizesText(e.target.value)} 
                style={{ width: '100%', marginTop: '4px', minHeight: '60px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '8px', fontFamily: 'inherit' }} 
              />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '12px', color: '#888' }}>Matnni kiriting (Yangi qator uchun Enter bosing):</label>
              <textarea 
                value={freeSizeText} 
                onChange={e => setFreeSizeText(e.target.value)} 
                style={{ width: '100%', marginTop: '4px', minHeight: '60px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '8px', fontFamily: 'inherit' }} 
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={freeSizeHasBorder} 
                  onChange={e => setFreeSizeHasBorder(e.target.checked)} 
                />
                Chiziqli (Ramka bilan)
              </label>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <button className="btn-primary" onClick={exportImage} disabled={!image || isExporting}>
            <Download size={20} />
            {isExporting ? 'Yuklanmoqda...' : 'Export Image'}
          </button>
          
          <button className="btn-secondary" onClick={saveTemplate} style={{ background: '#3b3b3b', borderColor: '#4b4b4b' }}>
            💾 Shablon sifatida saqlash
          </button>
        </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {image && (
          <div className="toolbar">
            <button 
              className={`btn-secondary ${isPicking ? 'active' : ''}`}
              onClick={() => setIsPicking(!isPicking)}
            >
              <Crosshair size={18} />
              {isPicking ? 'Click on dress to zoom...' : 'Set Zoom Point'}
            </button>
          </div>
        )}

        {image ? (
          <div
            ref={exportRef}
            style={{
              background: '#ffffff',
              padding: `${borderWidth}px`,
              display: 'inline-block',
              lineHeight: 0
            }}
          >
          <div
            className={`canvas-wrapper ${isPicking ? 'picking-mode' : ''}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
          >
            <img 
              ref={imageRef}
              src={image} 
              alt="Main Product" 
              className="main-image" 
            />
            
            <div className="overlay-layer">
              {/* Logo */}
              <div 
                className={`logo-overlay draggable-item ${draggingElement === 'logo' ? 'dragging' : ''} ${selectedElement === 'logo' ? 'selected-element' : ''}`} 
                onPointerDown={(e) => handlePointerDown(e, 'logo')}
                style={{ 
                  top: `calc(${positions.logo.y} * var(--cqw))`, 
                  left: `calc(${positions.logo.x} * var(--cqw))`, 
                  width: `calc(${positions.logo.scale} * var(--cqw))`,
                  opacity: elementStyles.logo.opacity
                }}
              >
                {logo ? (
                  <img 
                    src={logo} 
                    alt="Logo" 
                    onError={() => {
                      if (logo === '/logo.png') setLogo(null);
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 200 60" width="100%" height="auto">
                    <text x="0" y="30" fontFamily="Inter" fontSize="28" fontWeight="800" fill="#1a1a1a">M I L A N A</text>
                    <text x="0" y="50" fontFamily="Inter" fontSize="14" fontWeight="500" fill="#333" letterSpacing="4">PREMIUM</text>
                  </svg>
                )}
                {selectedElement === 'logo' && <div className="resize-handle corner" onPointerDown={(e) => handleResizeDown(e, 'logo', 'corner')} />}
              </div>

              {/* Badge */}
              <div 
                className={`badge-overlay draggable-item ${draggingElement === 'badge' ? 'dragging' : ''} ${selectedElement === 'badge' ? 'selected-element' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'badge')}
                style={{ 
                  top: `calc(${positions.badge.y} * var(--cqw))`, 
                  left: `calc(${positions.badge.x} * var(--cqw))`,
                  transform: `scale(${elementStyles.badge.scale})`,
                  transformOrigin: 'top left',
                  '--sx': elementStyles.badge.scaleX || 1,
                  '--sy': elementStyles.badge.scaleY || 1,
                  border: badgeHasBorder ? `calc(0.15 * var(--cqw)) solid ${elementStyles.badge.borderColor}` : 'none'
                }}
              >
                <div 
                  className="badge-top" 
                  style={{ 
                    background: hexToRgba(elementStyles.badge.topBg, elementStyles.badge.opacity), 
                    borderBottom: badgeHasBorder ? `calc(0.15 * var(--cqw)) solid ${elementStyles.badge.borderColor}` : 'none' 
                  }}
                >
                  <p className="badge-title" style={{ color: elementStyles.badge.titleColor }}>{data.badgeTitle}</p>
                </div>
                <div className="badge-bottom" style={{ background: hexToRgba(elementStyles.badge.bottomBg, elementStyles.badge.opacity) }}>
                  <p className="badge-subtitle" style={{ color: elementStyles.badge.subtitleColor }}>{data.badgeSubtitle}</p>
                </div>
                {selectedElement === 'badge' && (
                  <div className="resize-handle corner" onPointerDown={(e) => handleResizeDown(e, 'badge', 'corner')} />
                )}
              </div>

              {/* Model & Code */}
              <div 
                className={`model-code-overlay draggable-item ${draggingElement === 'modelCode' ? 'dragging' : ''} ${selectedElement === 'modelCode' ? 'selected-element' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'modelCode')}
                style={{ 
                  top: `calc(${positions.modelCode.y} * var(--cqw))`, 
                  left: `calc(${positions.modelCode.x} * var(--cqw))`,
                  opacity: elementStyles.modelCode.opacity,
                  transform: `scale(${elementStyles.modelCode.scale})`,
                  transformOrigin: 'top left',
                  '--sx': elementStyles.modelCode.scaleX || 1,
                  '--sy': elementStyles.modelCode.scaleY || 1,
                  '--model-color': elementStyles.modelCode.textColor
                }}
              >
                <div className="bracket-top">
                  <div className="bracket-left-corner"></div>
                  <div className="bracket-horizontal-line"></div>
                  <span className="bracket-label">{data.modelLabel}</span>
                  <div className="bracket-horizontal-line"></div>
                  <div className="bracket-right-corner"></div>
                </div>
                <div className="mc-value huge">{data.modelValue}</div>
                <div className="bracket-bottom">
                  <div className="bracket-left-corner"></div>
                  <div className="bracket-horizontal-line"></div>
                  <div className="bracket-right-corner"></div>
                </div>

                <div className="code-box">
                  <span className="code-label">{data.codeLabel}</span>
                  <div className="mc-value medium">{data.codeValue}</div>
                </div>
                {selectedElement === 'modelCode' && (
                  <div className="resize-handle corner" onPointerDown={(e) => handleResizeDown(e, 'modelCode', 'corner')} />
                )}
              </div>

              {/* Sizes */}
              {sizesMode === 'list' ? (
                selectedSizes.length > 0 && (
                  <div 
                    className={`sizes-overlay draggable-item ${draggingElement === 'sizes' ? 'dragging' : ''} ${selectedElement === 'sizes' ? 'selected-element' : ''}`}
                    onPointerDown={(e) => handlePointerDown(e, 'sizes')}
                    style={{
                      top: `calc(${positions.sizes.y} * var(--cqw))`,
                      left: `calc(${positions.sizes.x} * var(--cqw))`,
                      '--sx': elementStyles.sizes.scaleX || 1,
                      '--sy': elementStyles.sizes.scaleY || 1,
                      background: hexToRgba(elementStyles.sizes.bgColor, elementStyles.sizes.opacity)
                    }}
                  >
                    {selectedSizes.map(size => (
                      <div className="size-item" key={size}>
                        <div className="size-box" style={{ '--box-color': elementStyles.sizes.borderColor }}></div>
                        <span className="size-text" style={{ color: elementStyles.sizes.textColor }}>{size}</span>
                      </div>
                    ))}
                    {selectedElement === 'sizes' && (
                      <>
                        <div className="resize-handle right" onPointerDown={(e) => handleResizeDown(e, 'sizes', 'horizontal')} />
                        <div className="resize-handle bottom" onPointerDown={(e) => handleResizeDown(e, 'sizes', 'vertical')} />
                      </>
                    )}
                  </div>
                )
              ) : (
                <div 
                  className={`free-size-badge draggable-item ${draggingElement === 'sizes' ? 'dragging' : ''} ${selectedElement === 'sizes' ? 'selected-element' : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, 'sizes')}
                  style={{
                    top: `calc(${positions.sizes.y} * var(--cqw))`,
                    left: `calc(${positions.sizes.x} * var(--cqw))`,
                    '--sx': elementStyles.sizes.scaleX || 1,
                    '--sy': elementStyles.sizes.scaleY || 1,
                    background: hexToRgba(elementStyles.sizes.bgColor, elementStyles.sizes.opacity),
                    color: elementStyles.sizes.textColor,
                    border: freeSizeHasBorder ? `calc(0.2 * var(--cqw)) solid ${elementStyles.sizes.borderColor}` : 'none',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}
                >
                  {freeSizeText}
                  {selectedElement === 'sizes' && (
                    <>
                      <div className="resize-handle right" onPointerDown={(e) => handleResizeDown(e, 'sizes', 'horizontal')} />
                      <div className="resize-handle bottom" onPointerDown={(e) => handleResizeDown(e, 'sizes', 'vertical')} />
                    </>
                  )}
                </div>
              )}

              {/* Magnifier */}
              {showMagnifier && (magnifierPoint || fabricImage) && (
                <>
                  {magnifierPoint && (() => {
                    const scale = Number(elementStyles.magnifier.scale) || 1;
                    const R = 12 * scale;
                    const Cx = Number(positions.magnifier.x) + R;
                    const Cy = Number(positions.magnifier.y) + R;
                    return (
                      <svg className="magnifier-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}>
                        <line 
                          x1={`${magnifierPoint.x}%`} 
                          y1={`${magnifierPoint.y}%`} 
                          x2={`${Cx}%`} 
                          y2={`${Cy / aspectRatio}%`} 
                          style={{
                            stroke: elementStyles.magnifier.borderColor || 'white',
                            strokeWidth: 'calc(0.2 * var(--cqw))'
                          }}
                        />
                        <circle cx={`${magnifierPoint.x}%`} cy={`${magnifierPoint.y}%`} r="calc(0.5 * var(--cqw))" fill={elementStyles.magnifier.borderColor || 'white'} />
                      </svg>
                    );
                  })()}
                  <div 
                    className={`magnifier-overlay draggable-item ${draggingElement === 'magnifier' ? 'dragging' : ''} ${selectedElement === 'magnifier' ? 'selected-element' : ''}`}
                    onPointerDown={(e) => handlePointerDown(e, 'magnifier')}
                    style={{
                      position: 'absolute',
                      top: `calc(${positions.magnifier.y} * var(--cqw))`,
                      left: `calc(${positions.magnifier.x} * var(--cqw))`,
                      width: `calc(24 * var(--cqw))`,
                      height: `calc(24 * var(--cqw))`,
                      transform: `scale(${elementStyles.magnifier.scale})`,
                      transformOrigin: 'top left',
                      borderRadius: '50%'
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `calc(0.2 * var(--cqw)) solid ${elementStyles.magnifier.borderColor}`,
                      position: 'relative'
                    }}>
                      {!fabricImage && (
                        <img 
                          src={image} 
                          style={{
                            position: 'absolute',
                            width: 'calc(400 * var(--cqw))', 
                            maxWidth: 'none',
                            left: 'calc(12 * var(--cqw))',
                            top: 'calc(12 * var(--cqw))',
                            transform: `translate(-${magnifierPoint ? magnifierPoint.x : 50}%, -${magnifierPoint ? magnifierPoint.y : 50}%)`,
                            pointerEvents: 'none'
                          }}
                          alt="Zoomed detail"
                        />
                      )}
                      {fabricImage && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url(${fabricImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }} />
                      )}
                    </div>
                    {selectedElement === 'magnifier' && (
                      <div className="resize-handle corner" onPointerDown={(e) => handleResizeDown(e, 'magnifier', 'corner')} />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        ) : (
          <div className="empty-state">
            <ImageIcon size={64} />
            <h2>No image uploaded</h2>
            <p>Please upload a main image from the sidebar to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
