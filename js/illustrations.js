/* ==========================================================================
   Luntian Kitchen — Original SVG Culinary Illustrations & Coherent Iconography
   Strictly Three Palette Colors: #2D5E48, #F6F3EC, #26302B
   ========================================================================== */

(function (global) {
  'use strict';

  var C_GREEN = '#2D5E48';
  var C_OFFWHITE = '#F6F3EC';
  var C_CHARCOAL = '#26302B';

  function createSvgElement(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== undefined && attrs[k] !== null) {
          el.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return el;
  }

  /* --------------------------------------------------------------------------
     1. Original Brand Emblem SVG
     -------------------------------------------------------------------------- */
  function createBrandEmblemSvg() {
    var svg = createSvgElement('svg', {
      viewBox: '0 0 36 36',
      fill: 'none',
      class: 'brand-mark-svg',
      'aria-hidden': 'true'
    });

    svg.appendChild(createSvgElement('rect', {
      x: '1.5',
      y: '1.5',
      width: '33',
      height: '33',
      rx: '6',
      fill: C_OFFWHITE,
      stroke: C_OFFWHITE,
      'stroke-width': '1.5'
    }));

    // Architectural vessel bowl + botanical leaf arch
    svg.appendChild(createSvgElement('path', {
      d: 'M8 20C8 24.9706 12.0294 29 17 29H19C23.9706 29 28 24.9706 28 20H8Z',
      fill: C_GREEN
    }));

    svg.appendChild(createSvgElement('path', {
      d: 'M18 7C13.5 7 10.5 10.5 10.5 15.5H25.5C25.5 10.5 22.5 7 18 7Z',
      stroke: C_CHARCOAL,
      'stroke-width': '2',
      'stroke-linejoin': 'round'
    }));

    svg.appendChild(createSvgElement('path', {
      d: 'M18 7V15.5M14 11.5L18 14.5M22 11.5L18 14.5',
      stroke: C_GREEN,
      'stroke-width': '1.75',
      'stroke-linecap': 'round'
    }));

    svg.appendChild(createSvgElement('line', {
      x1: '11',
      y1: '31.5',
      x2: '25',
      y2: '31.5',
      stroke: C_CHARCOAL,
      'stroke-width': '2',
      'stroke-linecap': 'round'
    }));

    return svg;
  }

  /* --------------------------------------------------------------------------
     2. Hero Culinary Table Composition SVG
     -------------------------------------------------------------------------- */
  function createHeroCompositionSvg(branchName, modeLabel) {
    var svg = createSvgElement('svg', {
      viewBox: '0 0 560 400',
      fill: 'none',
      role: 'img',
      'aria-label': 'Architectural table study of signature chicken plate, brioche burger, and house beverage'
    });

    // Background architectural drafting sheet
    svg.appendChild(createSvgElement('rect', {
      x: '0',
      y: '0',
      width: '560',
      height: '400',
      fill: C_OFFWHITE
    }));

    // Subtle drafting grid lines in charcoal opacity
    for (var gx = 56; gx < 560; gx += 56) {
      svg.appendChild(createSvgElement('line', {
        x1: gx,
        y1: '20',
        x2: gx,
        y2: '380',
        stroke: C_CHARCOAL,
        'stroke-opacity': '0.07',
        'stroke-width': '1'
      }));
    }
    for (var gy = 50; gy < 400; gy += 50) {
      svg.appendChild(createSvgElement('line', {
        x1: '20',
        y1: gy,
        x2: '540',
        y2: gy,
        stroke: C_CHARCOAL,
        'stroke-opacity': '0.07',
        'stroke-width': '1'
      }));
    }

    // Outer architectural frame
    svg.appendChild(createSvgElement('rect', {
      x: '20',
      y: '20',
      width: '520',
      height: '360',
      rx: '8',
      stroke: C_CHARCOAL,
      'stroke-opacity': '0.22',
      'stroke-width': '1.5'
    }));

    // Large dark green botanical arch backdrop
    svg.appendChild(createSvgElement('path', {
      d: 'M72 340V168C72 95.0984 131.098 36 204 36H356C428.902 36 488 95.0984 488 168V340H72Z',
      fill: C_GREEN,
      'fill-opacity': '0.12'
    }));

    // Main Ceramic Platter (Center-Left)
    svg.appendChild(createSvgElement('ellipse', {
      cx: '235',
      cy: '248',
      rx: '132',
      ry: '86',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    svg.appendChild(createSvgElement('ellipse', {
      cx: '235',
      cy: '248',
      rx: '108',
      ry: '68',
      fill: C_GREEN,
      'fill-opacity': '0.1',
      stroke: C_CHARCOAL,
      'stroke-width': '1.25',
      'stroke-dasharray': '4 4'
    }));

    // Jasmine Rice Dome inside platter
    svg.appendChild(createSvgElement('path', {
      d: 'M150 248C150 218 175 198 205 198C235 198 258 218 258 248H150Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Rice texture ticks
    var riceCoords = [[182, 218], [202, 212], [220, 222], [174, 232], [208, 230], [232, 235]];
    riceCoords.forEach(function (pt) {
      svg.appendChild(createSvgElement('line', {
        x1: pt[0],
        y1: pt[1],
        x2: pt[0] + 7,
        y2: pt[1] - 3,
        stroke: C_CHARCOAL,
        'stroke-width': '2',
        'stroke-linecap': 'round'
      }));
    });

    // Roast Herb Chicken Quarter on Platter
    svg.appendChild(createSvgElement('path', {
      d: 'M222 258C218 228 246 202 284 206C314 209 328 232 320 256C312 278 278 286 244 278C228 274 224 268 222 258Z',
      fill: C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    // Crisp skin sear lines on chicken
    svg.appendChild(createSvgElement('path', {
      d: 'M248 230C264 226 286 228 300 238M244 248C262 244 282 246 296 256',
      stroke: C_OFFWHITE,
      'stroke-width': '2',
      'stroke-linecap': 'round'
    }));

    // Sauce ramekin inside platter
    svg.appendChild(createSvgElement('circle', {
      cx: '192',
      cy: '274',
      r: '20',
      fill: C_CHARCOAL
    }));
    svg.appendChild(createSvgElement('circle', {
      cx: '192',
      cy: '274',
      r: '13',
      fill: C_GREEN
    }));

    // Secondary Wooden Board with Brioche Burger (Upper Right)
    svg.appendChild(createSvgElement('rect', {
      x: '336',
      y: '96',
      width: '164',
      height: '126',
      rx: '12',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Burger Crown Bun
    svg.appendChild(createSvgElement('path', {
      d: 'M366 154C366 124 388 110 418 110C448 110 470 124 470 154H366Z',
      fill: C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));
    // Sesame seeds
    [[402, 126], [418, 122], [434, 128], [410, 136], [428, 137]].forEach(function (s) {
      svg.appendChild(createSvgElement('line', {
        x1: s[0],
        y1: s[1],
        x2: s[0] + 4,
        y2: s[1],
        stroke: C_OFFWHITE,
        'stroke-width': '2',
        'stroke-linecap': 'round'
      }));
    });
    // Folded Cheese & Seared Patty
    svg.appendChild(createSvgElement('rect', {
      x: '362',
      y: '160',
      width: '112',
      height: '16',
      rx: '6',
      fill: C_CHARCOAL
    }));
    svg.appendChild(createSvgElement('path', {
      d: 'M370 160L384 170L398 160M432 160L446 170L460 160',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '1.5'
    }));
    // Bottom Bun
    svg.appendChild(createSvgElement('path', {
      d: 'M368 180H468C468 192 458 198 446 198H390C378 198 368 192 368 180Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Tall Crafted Beverage Vessel (Lower Right)
    svg.appendChild(createSvgElement('path', {
      d: 'M394 252H466L456 346H404L394 252Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25',
      'stroke-linejoin': 'round'
    }));
    svg.appendChild(createSvgElement('path', {
      d: 'M398 278H462L455 342H405L398 278Z',
      fill: C_GREEN
    }));
    // Straw
    svg.appendChild(createSvgElement('path', {
      d: 'M434 334V228L452 216',
      stroke: C_CHARCOAL,
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));

    // Top-left drafting annotation badge
    var labelText = createSvgElement('text', {
      x: '38',
      y: '48',
      fill: C_CHARCOAL,
      'font-family': 'Inter, sans-serif',
      'font-size': '12',
      'font-weight': '600'
    });
    labelText.textContent = 'BRANCH DISPATCH · ' + (branchName || 'TUNASAN').toUpperCase() + ' · ' + (modeLabel || 'DELIVERY').toUpperCase();
    svg.appendChild(labelText);

    return svg;
  }

  /* --------------------------------------------------------------------------
     3. Dish Illustration Generator (4 Distinct Gallery Angles per Item)
        frameIndex:
          0 = Plate Study (Primary)
          1 = Cross-Section / Cutaway
          2 = Accompaniment & Pairing
          3 = Takeaway Vessel & Packaging
     -------------------------------------------------------------------------- */
  function createDishIllustrationSvg(dish, frameIndex) {
    var frame = typeof frameIndex === 'number' ? frameIndex : 0;
    var category = (dish && dish.category) || 'Burgers';
    var name = (dish && dish.name) || 'Dish';

    var svg = createSvgElement('svg', {
      viewBox: '0 0 400 260',
      fill: 'none',
      role: 'img',
      'aria-label': name + ' — culinary illustration view ' + (frame + 1)
    });

    // Base surface
    svg.appendChild(createSvgElement('rect', {
      x: '0',
      y: '0',
      width: '400',
      height: '260',
      fill: C_OFFWHITE
    }));

    // Subtle geometric drafting frame
    svg.appendChild(createSvgElement('rect', {
      x: '14',
      y: '14',
      width: '372',
      height: '232',
      rx: '6',
      stroke: C_CHARCOAL,
      'stroke-opacity': '0.16',
      'stroke-width': '1.25'
    }));

    // Frame-specific background architectural motif
    if (frame === 0) {
      svg.appendChild(createSvgElement('circle', {
        cx: '200',
        cy: '134',
        r: '88',
        fill: C_GREEN,
        'fill-opacity': '0.11'
      }));
    } else if (frame === 1) {
      svg.appendChild(createSvgElement('rect', {
        x: '60',
        y: '42',
        width: '280',
        height: '176',
        rx: '8',
        fill: C_CHARCOAL,
        'fill-opacity': '0.06'
      }));
      // Cross-section datum line
      svg.appendChild(createSvgElement('line', {
        x1: '36',
        y1: '134',
        x2: '364',
        y2: '134',
        stroke: C_CHARCOAL,
        'stroke-opacity': '0.28',
        'stroke-dasharray': '5 5',
        'stroke-width': '1.25'
      }));
    } else if (frame === 2) {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '200',
        cy: '146',
        rx: '144',
        ry: '72',
        fill: C_GREEN,
        'fill-opacity': '0.12'
      }));
    } else {
      svg.appendChild(createSvgElement('path', {
        d: 'M90 210L116 64H284L310 210H90Z',
        fill: C_GREEN,
        'fill-opacity': '0.1'
      }));
    }

    // Draw category-specific geometry
    if (category === 'Burgers') {
      drawBurgerArtwork(svg, frame, dish.id);
    } else if (category === 'Chickens') {
      drawChickenArtwork(svg, frame, dish.id);
    } else if (category === 'Fries') {
      drawFriesArtwork(svg, frame, dish.id);
    } else if (category === 'Drinks') {
      drawDrinkArtwork(svg, frame, dish.id);
    } else if (category === 'Desserts') {
      drawDessertArtwork(svg, frame, dish.id);
    } else {
      drawKidsMealArtwork(svg, frame, dish.id);
    }

    // Corner study caption in SVG
    var frameTitles = ['01 / PLATE STUDY', '02 / CUTAWAY PROFILE', '03 / PORTION PAIRING', '04 / BRANCH VESSEL'];
    var tag = createSvgElement('text', {
      x: '26',
      y: '34',
      fill: C_CHARCOAL,
      'fill-opacity': '0.65',
      'font-family': 'Inter, sans-serif',
      'font-size': '10',
      'font-weight': '600'
    });
    tag.textContent = frameTitles[frame % 4];
    svg.appendChild(tag);

    return svg;
  }

  function drawBurgerArtwork(svg, frame) {
    if (frame === 3) {
      // Clamshell craft packaging box
      svg.appendChild(createSvgElement('path', {
        d: 'M116 144L136 92H264L284 144H116Z',
        fill: C_OFFWHITE,
        stroke: C_CHARCOAL,
        'stroke-width': '2.5',
        'stroke-linejoin': 'round'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M112 144H288L272 198H128L112 144Z',
        fill: C_GREEN,
        stroke: C_CHARCOAL,
        'stroke-width': '2.5',
        'stroke-linejoin': 'round'
      }));
      svg.appendChild(createSvgElement('rect', {
        x: '170',
        y: '112',
        width: '60',
        height: '18',
        rx: '3',
        fill: C_CHARCOAL
      }));
      return;
    }

    var cx = frame === 2 ? 172 : 200;
    // Plate rim
    svg.appendChild(createSvgElement('ellipse', {
      cx: '200',
      cy: '194',
      rx: '124',
      ry: '22',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Top brioche crown
    svg.appendChild(createSvgElement('path', {
      d: 'M' + (cx - 72) + ' 132C' + (cx - 72) + ' 88 ' + (cx - 40) + ' 68 ' + cx + ' 68C' + (cx + 40) + ' 68 ' + (cx + 72) + ' 88 ' + (cx + 72) + ' 132H' + (cx - 72) + 'Z',
      fill: frame === 1 ? C_OFFWHITE : C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5',
      'stroke-linejoin': 'round'
    }));

    if (frame === 1) {
      // Cross section crumb texture inside bun
      [[cx - 35, 96], [cx, 88], [cx + 32, 98], [cx - 18, 112], [cx + 18, 114]].forEach(function (p) {
        svg.appendChild(createSvgElement('circle', {
          cx: p[0],
          cy: p[1],
          r: '2.5',
          fill: C_CHARCOAL
        }));
      });
    } else {
      // Sesame seeds on crown
      [[cx - 26, 90], [cx, 84], [cx + 26, 92], [cx - 12, 104], [cx + 16, 104]].forEach(function (p) {
        svg.appendChild(createSvgElement('line', {
          x1: p[0],
          y1: p[1],
          x2: p[0] + 6,
          y2: p[1],
          stroke: C_OFFWHITE,
          'stroke-width': '2.25',
          'stroke-linecap': 'round'
        }));
      });
    }

    // Lettuce & pickle wave
    svg.appendChild(createSvgElement('path', {
      d: 'M' + (cx - 78) + ' 138Q' + (cx - 52) + ' 128 ' + (cx - 26) + ' 138T' + (cx + 26) + ' 138T' + (cx + 78) + ' 138',
      stroke: C_CHARCOAL,
      'stroke-width': '3',
      'stroke-linecap': 'round'
    }));

    // Seared beef patty
    svg.appendChild(createSvgElement('rect', {
      x: cx - 76,
      y: '144',
      width: '152',
      height: '22',
      rx: '9',
      fill: C_CHARCOAL
    }));

    // Melted cheese corners
    svg.appendChild(createSvgElement('path', {
      d: 'M' + (cx - 56) + ' 144L' + (cx - 34) + ' 160L' + (cx - 14) + ' 144M' + (cx + 18) + ' 144L' + (cx + 38) + ' 160L' + (cx + 58) + ' 144',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '1.75'
    }));

    // Bottom bun
    svg.appendChild(createSvgElement('path', {
      d: 'M' + (cx - 70) + ' 170H' + (cx + 70) + 'C' + (cx + 70) + ' 184 ' + (cx + 56) + ' 192 ' + (cx + 40) + ' 192H' + (cx - 40) + 'C' + (cx - 56) + ' 192 ' + (cx - 70) + ' 184 ' + (cx - 70) + ' 170Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    // Frame 2: Side pairing ramekin + crisp fries
    if (frame === 2) {
      svg.appendChild(createSvgElement('rect', {
        x: '266',
        y: '126',
        width: '48',
        height: '62',
        rx: '4',
        fill: C_GREEN,
        stroke: C_CHARCOAL,
        'stroke-width': '2.25'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M274 126V98M286 126V92M298 126V96M308 126V104',
        stroke: C_CHARCOAL,
        'stroke-width': '4',
        'stroke-linecap': 'round'
      }));
    }
  }

  function drawChickenArtwork(svg, frame) {
    if (frame === 3) {
      // Takeaway meal box with steam vents
      svg.appendChild(createSvgElement('rect', {
        x: '104',
        y: '96',
        width: '192',
        height: '96',
        rx: '8',
        fill: C_OFFWHITE,
        stroke: C_CHARCOAL,
        'stroke-width': '2.5'
      }));
      svg.appendChild(createSvgElement('rect', {
        x: '104',
        y: '132',
        width: '192',
        height: '28',
        fill: C_GREEN
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '96',
        y1: '132',
        x2: '304',
        y2: '132',
        stroke: C_CHARCOAL,
        'stroke-width': '2.5'
      }));
      return;
    }

    // Oval ceramic dinner plate
    svg.appendChild(createSvgElement('ellipse', {
      cx: '200',
      cy: '164',
      rx: '134',
      ry: '56',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    // Jasmine rice mound
    svg.appendChild(createSvgElement('path', {
      d: 'M98 164C98 130 124 108 156 108C188 108 212 130 212 164H98Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Golden-crisp chicken piece
    svg.appendChild(createSvgElement('path', {
      d: 'M186 168C182 132 214 98 258 104C292 108 310 134 300 162C290 186 248 194 210 184C194 180 188 176 186 168Z',
      fill: frame === 1 ? C_OFFWHITE : C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    // Drumstick bone end
    svg.appendChild(createSvgElement('path', {
      d: 'M298 144L324 138C330 134 334 142 328 148C334 152 330 160 322 156L296 158',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25',
      'stroke-linejoin': 'round'
    }));

    // Signature gravy boat
    svg.appendChild(createSvgElement('circle', {
      cx: '154',
      cy: '182',
      r: '20',
      fill: C_CHARCOAL
    }));
    svg.appendChild(createSvgElement('circle', {
      cx: '154',
      cy: '182',
      r: '13',
      fill: C_GREEN
    }));
  }

  function drawFriesArtwork(svg, frame) {
    // Crisp batons + vessel
    var batons = [
      [148, 72, 160, 160],
      [166, 62, 174, 160],
      [184, 56, 188, 160],
      [202, 54, 200, 160],
      [220, 60, 214, 160],
      [238, 68, 228, 160],
      [254, 78, 240, 160]
    ];
    batons.forEach(function (b, idx) {
      svg.appendChild(createSvgElement('line', {
        x1: b[0],
        y1: b[1],
        x2: b[2],
        y2: b[3],
        stroke: idx % 2 === 0 ? C_CHARCOAL : C_GREEN,
        'stroke-width': '11',
        'stroke-linecap': 'round'
      }));
    });

    // Architectural fry sleeve
    svg.appendChild(createSvgElement('path', {
      d: 'M132 126C168 142 232 142 268 126L252 212H148L132 126Z',
      fill: frame === 1 ? C_OFFWHITE : C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5',
      'stroke-linejoin': 'round'
    }));

    // Dipping ramekin on side
    if (frame === 2 || frame === 0) {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '296',
        cy: '196',
        rx: '28',
        ry: '16',
        fill: C_CHARCOAL
      }));
      svg.appendChild(createSvgElement('ellipse', {
        cx: '296',
        cy: '193',
        rx: '20',
        ry: '10',
        fill: C_OFFWHITE
      }));
    }
  }

  function drawDrinkArtwork(svg, frame) {
    // Architectural tall glass
    svg.appendChild(createSvgElement('path', {
      d: 'M152 76H248L234 212H166L152 76Z',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5',
      'stroke-linejoin': 'round'
    }));

    // Liquid level
    svg.appendChild(createSvgElement('path', {
      d: 'M156 108H244L232 208H168L156 108Z',
      fill: frame === 1 ? C_CHARCOAL : C_GREEN,
      'fill-opacity': frame === 1 ? '0.2' : '0.88'
    }));

    // Geometric ice cubes
    [[174, 122], [204, 130], [184, 154]].forEach(function (ic) {
      svg.appendChild(createSvgElement('rect', {
        x: ic[0],
        y: ic[1],
        width: '20',
        height: '20',
        rx: '3',
        fill: C_OFFWHITE,
        stroke: C_CHARCOAL,
        'stroke-width': '1.75'
      }));
    });

    // Reusable angled straw
    svg.appendChild(createSvgElement('path', {
      d: 'M208 194V52L232 38',
      stroke: C_CHARCOAL,
      'stroke-width': '3',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));
  }

  function drawDessertArtwork(svg, frame) {
    // Footed coupe bowl
    svg.appendChild(createSvgElement('path', {
      d: 'M136 136C136 172 164 192 200 192C236 192 264 172 264 136H136Z',
      fill: C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));
    svg.appendChild(createSvgElement('path', {
      d: 'M200 192V216M168 216H232',
      stroke: C_CHARCOAL,
      'stroke-width': '3',
      'stroke-linecap': 'round'
    }));

    // Soft-serve architectural swirls
    svg.appendChild(createSvgElement('path', {
      d: 'M150 136C150 114 172 104 200 104C228 104 250 114 250 136',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));
    svg.appendChild(createSvgElement('path', {
      d: 'M166 108C166 88 182 78 200 78C218 78 234 88 234 108',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));
    svg.appendChild(createSvgElement('path', {
      d: 'M184 82C184 66 194 56 200 48C208 56 216 66 216 82',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));

    // Cacao wafer stick
    if (frame !== 1) {
      svg.appendChild(createSvgElement('path', {
        d: 'M222 114L254 66L264 72L232 120Z',
        fill: C_CHARCOAL
      }));
    }
  }

  function drawKidsMealArtwork(svg) {
    // Bento-style compartment tray
    svg.appendChild(createSvgElement('rect', {
      x: '84',
      y: '66',
      width: '232',
      height: '144',
      rx: '12',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.5'
    }));
    svg.appendChild(createSvgElement('line', {
      x1: '208',
      y1: '66',
      x2: '208',
      y2: '210',
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));
    svg.appendChild(createSvgElement('line', {
      x1: '208',
      y1: '138',
      x2: '316',
      y2: '138',
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));

    // Main compartment: Junior slider or chicken tenders
    svg.appendChild(createSvgElement('circle', {
      cx: '146',
      cy: '138',
      r: '42',
      fill: C_GREEN,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));
    // Side 1: Fruit/fries
    svg.appendChild(createSvgElement('rect', {
      x: '228',
      y: '84',
      width: '68',
      height: '36',
      rx: '6',
      fill: C_CHARCOAL
    }));
    // Side 2: Juice cup
    svg.appendChild(createSvgElement('circle', {
      cx: '262',
      cy: '174',
      r: '22',
      fill: C_OFFWHITE,
      stroke: C_CHARCOAL,
      'stroke-width': '2.25'
    }));
    svg.appendChild(createSvgElement('circle', {
      cx: '262',
      cy: '174',
      r: '12',
      fill: C_GREEN
    }));
  }

  /* --------------------------------------------------------------------------
     4. Coherent Functional Icon Family (Inline SVG, Zero Color Tint)
     -------------------------------------------------------------------------- */
  function createIconSvg(name, size) {
    var dim = size || 16;
    var svg = createSvgElement('svg', {
      viewBox: '0 0 20 20',
      width: dim,
      height: dim,
      fill: 'none',
      'aria-hidden': 'true'
    });

    if (name === 'plus') {
      svg.appendChild(createSvgElement('path', {
        d: 'M10 4V16M4 10H16',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      }));
    } else if (name === 'minus') {
      svg.appendChild(createSvgElement('path', {
        d: 'M4 10H16',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      }));
    } else if (name === 'check') {
      svg.appendChild(createSvgElement('path', {
        d: 'M4.5 10.5L8.2 14.2L15.5 6.5',
        stroke: 'currentColor',
        'stroke-width': '2.2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }));
    } else if (name === 'search') {
      svg.appendChild(createSvgElement('circle', {
        cx: '9',
        cy: '9',
        r: '5.5',
        stroke: 'currentColor',
        'stroke-width': '1.8'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M13.2 13.2L17 17',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round'
      }));
    } else if (name === 'close') {
      svg.appendChild(createSvgElement('path', {
        d: 'M5 5L15 15M15 5L5 15',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round'
      }));
    } else if (name === 'arrow-right') {
      svg.appendChild(createSvgElement('path', {
        d: 'M4 10H16M11 5L16 10L11 15',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }));
    } else if (name === 'arrow-left') {
      svg.appendChild(createSvgElement('path', {
        d: 'M16 10H4M9 5L4 10L9 15',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }));
    } else if (name === 'warning-octagon') {
      // Distinct geometric warning icon for inline validation (no red hue)
      svg.appendChild(createSvgElement('polygon', {
        points: '6.5,2 13.5,2 18,6.5 18,13.5 13.5,18 6.5,18 2,13.5 2,6.5',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linejoin': 'round'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M10 6V10.8M10 14H10.01',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      }));
    } else if (name === 'copy') {
      svg.appendChild(createSvgElement('rect', {
        x: '7',
        y: '7',
        width: '10',
        height: '10',
        rx: '2',
        stroke: 'currentColor',
        'stroke-width': '1.7'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M13 7V5C13 3.89543 12.1046 3 11 3H5C3.89543 3 3 3.89543 3 5V11C3 12.1046 3.89543 13 5 13H7',
        stroke: 'currentColor',
        'stroke-width': '1.7'
      }));
    } else if (name === 'chevron-down') {
      svg.appendChild(createSvgElement('path', {
        d: 'M5 7.5L10 12.5L15 7.5',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }));
    } else if (name === 'branch-pin') {
      svg.appendChild(createSvgElement('path', {
        d: 'M10 17.5C10 17.5 15.5 12.8 15.5 8.5C15.5 5.46243 13.0376 3 10 3C6.96243 3 4.5 5.46243 4.5 8.5C4.5 12.8 10 17.5 10 17.5Z',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linejoin': 'round'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '10',
        cy: '8.5',
        r: '2',
        fill: 'currentColor'
      }));
    } else if (name === 'bag') {
      svg.appendChild(createSvgElement('path', {
        d: 'M5 6.5H15L16 16.5H4L5 6.5Z',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linejoin': 'round'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M7.5 6.5V5C7.5 3.61929 8.61929 2.5 10 2.5C11.3807 2.5 12.5 3.61929 12.5 5V6.5',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round'
      }));
    }

    return svg;
  }

  function createConfirmationCheckSvg() {
    var svg = createSvgElement('svg', {
      viewBox: '0 0 88 88',
      fill: 'none',
      class: 'confirm-emblem-svg',
      'aria-hidden': 'true'
    });

    svg.appendChild(createSvgElement('circle', {
      cx: '44',
      cy: '44',
      r: '38',
      fill: C_GREEN
    }));

    svg.appendChild(createSvgElement('circle', {
      cx: '44',
      cy: '44',
      r: '38',
      stroke: C_CHARCOAL,
      'stroke-width': '3',
      class: 'confirm-circle-path'
    }));

    svg.appendChild(createSvgElement('path', {
      d: 'M27 45.5L38.5 57L62 32.5',
      stroke: C_OFFWHITE,
      'stroke-width': '5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: 'confirm-check-path'
    }));

    return svg;
  }

  global.RestoIllustrations = {
    createBrandEmblemSvg: createBrandEmblemSvg,
    createHeroCompositionSvg: createHeroCompositionSvg,
    createDishIllustrationSvg: createDishIllustrationSvg,
    createIconSvg: createIconSvg,
    createConfirmationCheckSvg: createConfirmationCheckSvg
  };
})(window);
