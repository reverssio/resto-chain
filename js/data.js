/* ==========================================================================
   Luntian Kitchen — Front-End Data Layer, Centavo Math & Branch Inventory API
   Plain JavaScript (ES5/ES6 compatible, works over file:// and http://)
   Note: All persistence is client-side in localStorage with an in-memory
   fallback. Production systems enforce inventory locks, authentication,
   and payment settlement on a backend server.
   ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Single Brand & System Configuration Constant
        Rename `brandName` here to update the entire application.
     -------------------------------------------------------------------------- */
  var BRAND_CONFIG = {
    brandName: 'Luntian Kitchen',
    tagline: 'Good Food, Good Mood.',
    heroHeadline: 'Freshly prepared per branch, from kitchen ledger to your table.',
    heroLead: 'Choose your branch and fulfillment mode first. Every order checks live branch stock and reserves fresh ingredients directly from that kitchen.',
    currencyCode: 'PHP',
    locale: 'en-PH',
    deliveryFeeCentavos: 4900, /* ₱49.00 flat delivery fee; ₱0.00 for pick-up */
    vatRateNumerator: 12,
    vatRateDenominator: 112,   /* PH VAT-inclusive: total * 12 / 112 */
    maxQuantityPerLine: 15,
    storageKey: 'resto_chain_phase1_state_v1',
    channelName: 'resto_chain_phase1_sync'
  };

  /* --------------------------------------------------------------------------
     2. Branches (Tunasan & Biñan from project brief)
     -------------------------------------------------------------------------- */
  var BRANCHES = [
    {
      id: 'tunasan',
      name: 'Tunasan',
      fullName: 'Tunasan Branch',
      prefix: 'TUN',
      address: 'National Road, Brgy. Tunasan, Muntinlupa City',
      landmarkHint: 'Near Tunasan Civic Plaza & San Pedro boundary',
      phone: '(02) 8862-4100',
      hours: '7:00 AM – 10:00 PM',
      baseDeliveryMins: [25, 32],
      basePickupMins: [12, 18]
    },
    {
      id: 'binan',
      name: 'Biñan',
      fullName: 'Biñan Branch',
      prefix: 'BIN',
      address: 'Old National Highway, Brgy. Platero, Biñan, Laguna',
      landmarkHint: 'Across Platero Town Center, Biñan',
      phone: '(049) 511-2890',
      hours: '7:00 AM – 10:00 PM',
      baseDeliveryMins: [28, 35],
      basePickupMins: [14, 20]
    }
  ];

  /* --------------------------------------------------------------------------
     3. Mock Staff Demo Accounts (Front-End Only for Queue Demonstration)
     -------------------------------------------------------------------------- */
  var DEMO_STAFF_ACCOUNTS = [
    {
      id: 'staff-tunasan-cashier',
      username: 'cashier.tunasan',
      passcode: '1234',
      displayName: 'Mara Santos',
      role: 'Cashier',
      branchId: 'tunasan',
      branchName: 'Tunasan'
    },
    {
      id: 'staff-binan-cashier',
      username: 'cashier.binan',
      passcode: '1234',
      displayName: 'Jude Reyes',
      role: 'Cashier',
      branchId: 'binan',
      branchName: 'Biñan'
    }
  ];

  /* --------------------------------------------------------------------------
     4. Master Ingredients & Initial Per-Branch Stock
        Used by recipes to compute item availability and deduct stock per order.
     -------------------------------------------------------------------------- */
  var INGREDIENT_CATALOG = {
    chicken_cut:      { id: 'chicken_cut',      name: 'Fresh Marinated Chicken', unit: 'pcs' },
    jasmine_rice:     { id: 'jasmine_rice',     name: 'Steamed Jasmine Rice',    unit: 'portions' },
    signature_sauce:  { id: 'signature_sauce',  name: 'House Herb Gravy & Sauce', unit: 'portions' },
    meal_packaging:   { id: 'meal_packaging',   name: 'Craft Meal Packaging',    unit: 'sets' },
    beef_patty:       { id: 'beef_patty',       name: 'Seared Quarter Beef Patty', unit: 'patties' },
    brioche_bun:      { id: 'brioche_bun',      name: 'Toasted Brioche Bun',     unit: 'buns' },
    cheddar_slice:    { id: 'cheddar_slice',    name: 'Aged American Cheese',    unit: 'slices' },
    potato_batch:     { id: 'potato_batch',     name: 'Hand-Cut Potato Batch',   unit: 'portions' },
    citrus_brew:      { id: 'citrus_brew',      name: 'Calamansi & Tea Brew',    unit: 'servings' },
    barako_coldbrew:  { id: 'barako_coldbrew',  name: 'Batangas Barako Reserve', unit: 'servings' },
    sweet_cream:      { id: 'sweet_cream',      name: 'Artisanal Sweet Cream',   unit: 'cups' },
    tablea_cacao:     { id: 'tablea_cacao',     name: 'Roasted Tablea Cacao',    unit: 'portions' }
  };

  var INITIAL_BRANCH_INVENTORY = {
    tunasan: {
      chicken_cut: 36,
      jasmine_rice: 50,
      signature_sauce: 60,
      meal_packaging: 80,
      beef_patty: 34,
      brioche_bun: 40,
      cheddar_slice: 45,
      potato_batch: 42,
      citrus_brew: 48,
      barako_coldbrew: 0, /* Depleted in Tunasan to demonstrate out-of-stock item state */
      sweet_cream: 24,
      tablea_cacao: 18
    },
    binan: {
      chicken_cut: 28,
      jasmine_rice: 45,
      signature_sauce: 50,
      meal_packaging: 75,
      beef_patty: 30,
      brioche_bun: 36,
      cheddar_slice: 40,
      potato_batch: 38,
      citrus_brew: 44,
      barako_coldbrew: 22, /* Available in Biñan */
      sweet_cream: 20,
      tablea_cacao: 0      /* Depleted in Biñan so Tablea Tart is unavailable in Biñan */
    }
  };

  /* --------------------------------------------------------------------------
     5. Six-Category Menu Catalog with Category-Driven Options & Recipes
        All prices are VAT-inclusive and stored in integer centavos.
     -------------------------------------------------------------------------- */
  var MENU_CATEGORIES = [
    'Burgers',
    'Chickens',
    'Fries',
    'Drinks',
    'Desserts',
    'Kids Meals'
  ];

  var MENU_ITEMS = [
    /* --- 01. BURGERS (Options: Patty configuration, NOT drink sizes) --- */
    {
      id: 'classic-cheese-burger',
      name: 'Classic Cheese Burger',
      category: 'Burgers',
      featured: true,
      shortDesc: 'Seared beef patty, melted aged cheese, house pickles, diced onions, and mustard relish on a warm brioche bun.',
      longDesc: 'Prepared to order on a seasoned flat-top grill. Each burger uses 100% seared beef, melted aged cheese, crisp house-brined pickles, sweet onions, and tangy tomato-mustard relish tucked inside a freshly toasted brioche bun.',
      galleryCaptions: ['Plate Study', 'Brioche & Patty Cutaway', 'Served with Crisp Fries', 'Insulated Clamshell Box'],
      optionsLabel: 'Choose Patty Configuration',
      options: [
        {
          id: 'single-patty',
          label: 'Single Patty',
          sublabel: 'Quarter-pound sear',
          priceCentavos: 8900,
          recipe: { brioche_bun: 1, beef_patty: 1, cheddar_slice: 1, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'double-patty',
          label: 'Double Patty',
          sublabel: 'Two seared patties + double cheese',
          priceCentavos: 12900,
          recipe: { brioche_bun: 1, beef_patty: 2, cheddar_slice: 2, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'house-stack',
          label: 'House Stack + Fries',
          sublabel: 'Double patty + regular fries',
          priceCentavos: 16900,
          recipe: { brioche_bun: 1, beef_patty: 2, cheddar_slice: 2, potato_batch: 1, signature_sauce: 2, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'chargrilled-peppered-burger',
      name: 'Chargrilled Peppered Burger',
      category: 'Burgers',
      featured: false,
      shortDesc: 'Cracked black pepper beef sear, roasted garlic aioli, caramelized onion jam, and double cheddar.',
      longDesc: 'Crusted with coarse cracked black pepper and seared over high heat, layered with slow-caramelized onion jam, roasted garlic herb sauce, and two slices of melted cheddar on toasted brioche.',
      galleryCaptions: ['Plate Study', 'Cross-Section Sear', 'Portion Pairing', 'Branch Packaging'],
      optionsLabel: 'Choose Patty Configuration',
      options: [
        {
          id: 'single-patty',
          label: 'Single Patty',
          sublabel: 'Standard peppered sear',
          priceCentavos: 11900,
          recipe: { brioche_bun: 1, beef_patty: 1, cheddar_slice: 2, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'double-patty',
          label: 'Double Patty',
          sublabel: 'Two peppered patties',
          priceCentavos: 15900,
          recipe: { brioche_bun: 1, beef_patty: 2, cheddar_slice: 2, signature_sauce: 2, meal_packaging: 1 }
        }
      ]
    },

    /* --- 02. CHICKENS (Fixes "Shiken"; deducts chicken, rice, sauce, packaging) --- */
    {
      id: 'crispy-herb-chicken-meal',
      name: 'Crispy Herb Chicken Meal',
      category: 'Chickens',
      featured: true,
      shortDesc: '24-hour herb-brined crispy chicken served with steamed jasmine rice and warm house gravy.',
      longDesc: 'Our signature branch staple. Brined for 24 hours in rosemary, thyme, black pepper, and calamansi, dredged in crisp seasoned flour, and served piping hot with fragrant jasmine rice and rich house-simmered herb gravy.',
      galleryCaptions: ['Platter Study', 'Crisp Crust Cutaway', 'Rice & Gravy Pairing', 'Vented Meal Box'],
      optionsLabel: 'Choose Meal Portion',
      options: [
        {
          id: '1pc-meal',
          label: '1-Piece Chicken Meal',
          sublabel: '1 chicken + jasmine rice + sauce',
          priceCentavos: 10900,
          recipe: { chicken_cut: 1, jasmine_rice: 1, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: '2pc-meal',
          label: '2-Piece Chicken Meal',
          sublabel: '2 chicken + jasmine rice + 2 sauces',
          priceCentavos: 17900,
          recipe: { chicken_cut: 2, jasmine_rice: 1, signature_sauce: 2, meal_packaging: 1 }
        },
        {
          id: 'double-rice-2pc',
          label: '2-Piece + Extra Rice',
          sublabel: '2 chicken + 2 rice + 2 sauces',
          priceCentavos: 19900,
          recipe: { chicken_cut: 2, jasmine_rice: 2, signature_sauce: 2, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'honey-soy-glazed-chicken',
      name: 'Honey-Soy Glazed Chicken',
      category: 'Chickens',
      featured: false,
      shortDesc: 'Crisp boneless thigh glazed in warm wildflower honey, aged soy, and toasted ginger with jasmine rice.',
      longDesc: 'Double-crisped chicken brushed to order with a glossy reduction of wildflower honey, fermented soy, and fresh ginger, accompanied by steamed jasmine rice and extra glaze.',
      galleryCaptions: ['Plate Study', 'Glaze Cutaway', 'Jasmine Rice Pairing', 'Takeaway Box'],
      optionsLabel: 'Choose Meal Portion',
      options: [
        {
          id: '1pc-glazed',
          label: 'Solo Glazed Meal',
          sublabel: '1 glazed cut + rice + sauce',
          priceCentavos: 12500,
          recipe: { chicken_cut: 1, jasmine_rice: 1, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: '2pc-glazed',
          label: 'Duo Glazed Meal',
          sublabel: '2 glazed cuts + rice + 2 sauces',
          priceCentavos: 18900,
          recipe: { chicken_cut: 2, jasmine_rice: 1, signature_sauce: 2, meal_packaging: 1 }
        }
      ]
    },

    /* --- 03. FRIES (Fixes "Meduim" -> "Medium") --- */
    {
      id: 'sea-salt-crisp-fries',
      name: 'Sea-Salt Crisp Fries',
      category: 'Fries',
      featured: true,
      shortDesc: 'Thick-cut skin-on potato batons twice-cooked until golden and tossed in flaky sea salt.',
      longDesc: 'Hand-cut daily in each branch kitchen, blanched and twice-fried for a shatteringly crisp exterior and fluffy center, finished with Pangasinan sea salt and herb dip.',
      galleryCaptions: ['Sleeve Study', 'Potato Interior', 'Herb Dip Pairing', 'Vented Fry Sleeve'],
      optionsLabel: 'Choose Size',
      options: [
        {
          id: 'regular',
          label: 'Regular',
          sublabel: 'Solo crisp portion',
          priceCentavos: 6900,
          recipe: { potato_batch: 1, meal_packaging: 1 }
        },
        {
          id: 'medium',
          label: 'Medium',
          sublabel: 'Standard sharing cut',
          priceCentavos: 9900,
          recipe: { potato_batch: 2, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'large',
          label: 'Large',
          sublabel: 'Table basket + herb dip',
          priceCentavos: 12900,
          recipe: { potato_batch: 3, signature_sauce: 1, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'aged-cheddar-herb-fries',
      name: 'Aged Cheddar & Herb Fries',
      category: 'Fries',
      featured: false,
      shortDesc: 'Twice-cooked potato fries layered with warm cheddar sauce and cracked black pepper.',
      longDesc: 'Our sea-salt potato batons topped generously with warm aged cheddar sauce and toasted kitchen herbs.',
      galleryCaptions: ['Plate Study', 'Cheese Layer Profile', 'Side Pairing', 'Takeaway Tray'],
      optionsLabel: 'Choose Size',
      options: [
        {
          id: 'regular',
          label: 'Regular',
          sublabel: 'Single cheddar tray',
          priceCentavos: 8900,
          recipe: { potato_batch: 1, cheddar_slice: 1, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'medium',
          label: 'Medium',
          sublabel: 'Generous cheddar tray',
          priceCentavos: 11900,
          recipe: { potato_batch: 2, cheddar_slice: 2, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'large',
          label: 'Large',
          sublabel: 'Platter size',
          priceCentavos: 14900,
          recipe: { potato_batch: 3, cheddar_slice: 2, signature_sauce: 2, meal_packaging: 1 }
        }
      ]
    },

    /* --- 04. DRINKS --- */
    {
      id: 'calamansi-mint-cooler',
      name: 'Pressed Calamansi & Mint Cooler',
      category: 'Drinks',
      featured: true,
      shortDesc: 'Freshly squeezed Philippine calamansi infused with bruised garden mint and raw cane syrup.',
      longDesc: 'Bright, aromatic, and mixed fresh in every branch. Pressed calamansi juice balanced with light raw cane sweetness and garden mint over crystal ice.',
      galleryCaptions: ['Glass Study', 'Infusion Profile', 'Meal Pairing', 'Sealed Travel Cup'],
      optionsLabel: 'Choose Size',
      options: [
        {
          id: 'regular',
          label: 'Regular',
          sublabel: '12 oz chilled cup',
          priceCentavos: 5500,
          recipe: { citrus_brew: 1, meal_packaging: 1 }
        },
        {
          id: 'medium',
          label: 'Medium',
          sublabel: '16 oz chilled cup',
          priceCentavos: 6900,
          recipe: { citrus_brew: 2, meal_packaging: 1 }
        },
        {
          id: 'large',
          label: 'Large',
          sublabel: '22 oz tall cup',
          priceCentavos: 8500,
          recipe: { citrus_brew: 3, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'barako-sweet-cold-brew',
      name: 'Batangas Barako Cold Brew',
      category: 'Drinks',
      featured: false,
      shortDesc: '18-hour cold-steeped Batangas Liberica coffee lightly sweetened with muscovado syrup.',
      longDesc: 'Steeped in small batches for 18 hours using coarse-ground Batangas Barako beans and finished with a touch of dark muscovado sugar.',
      galleryCaptions: ['Vessel Study', 'Cold Steep Profile', 'Sweet Cream Option', 'Sealed Cup'],
      optionsLabel: 'Choose Size',
      options: [
        {
          id: 'regular',
          label: 'Regular',
          sublabel: '12 oz black cold brew',
          priceCentavos: 7500,
          recipe: { barako_coldbrew: 1, meal_packaging: 1 }
        },
        {
          id: 'medium',
          label: 'Medium',
          sublabel: '16 oz cold brew',
          priceCentavos: 8900,
          recipe: { barako_coldbrew: 2, meal_packaging: 1 }
        },
        {
          id: 'large',
          label: 'Large',
          sublabel: '22 oz cold brew',
          priceCentavos: 10500,
          recipe: { barako_coldbrew: 3, meal_packaging: 1 }
        }
      ]
    },

    /* --- 05. DESSERTS --- */
    {
      id: 'roasted-tablea-sundae',
      name: 'Roasted Tablea Cacao Sundae',
      category: 'Desserts',
      featured: false,
      shortDesc: 'Velvety sweet cream soft-serve folded with warm Davao tablea fudge and cacao nib crumble.',
      longDesc: 'Churned sweet cream topped with dark heirloom tablea chocolate reduction and roasted cacao wafer crumble.',
      galleryCaptions: ['Coupe Study', 'Layer Cutaway', 'Wafer Pairing', 'Insulated Cup'],
      optionsLabel: 'Choose Serving Size',
      options: [
        {
          id: 'solo-cup',
          label: 'Solo Cup',
          sublabel: 'Single swirled coupe',
          priceCentavos: 6500,
          recipe: { sweet_cream: 1, tablea_cacao: 1, meal_packaging: 1 }
        },
        {
          id: 'sharing-pint',
          label: 'Sharing Pint',
          sublabel: 'Double portion for two',
          priceCentavos: 11500,
          recipe: { sweet_cream: 2, tablea_cacao: 2, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'sweet-cream-muscovado-cup',
      name: 'Sweet Cream & Muscovado Swirl',
      category: 'Desserts',
      featured: false,
      shortDesc: 'Chilled sweet cream soft-serve drizzled with warm panutsa muscovado caramel and toasted rice.',
      longDesc: 'Simple, nostalgic Philippine flavors: cold sweet cream soft-serve contrasted with warm muscovado caramel and crisp toasted pinipig.',
      galleryCaptions: ['Coupe Study', 'Swirl Cutaway', 'Pinipig Pairing', 'Takeaway Cup'],
      optionsLabel: 'Choose Serving Size',
      options: [
        {
          id: 'solo-cup',
          label: 'Solo Cup',
          sublabel: 'Single serving',
          priceCentavos: 5900,
          recipe: { sweet_cream: 1, meal_packaging: 1 }
        },
        {
          id: 'sharing-pint',
          label: 'Sharing Pint',
          sublabel: 'Double serving',
          priceCentavos: 10500,
          recipe: { sweet_cream: 2, meal_packaging: 1 }
        }
      ]
    },

    /* --- 06. KIDS MEALS --- */
    {
      id: 'junior-chicken-bento',
      name: 'Junior Crispy Chicken Bento',
      category: 'Kids Meals',
      featured: false,
      shortDesc: 'One tender herb chicken cut, steamed jasmine rice, regular sea-salt fries, and small calamansi cooler.',
      longDesc: 'Balanced portion crafted for younger diners: a mild herb-brined chicken piece, warm jasmine rice, a side of sea-salt potato fries, and a 12 oz calamansi cooler in a compartmentalized box.',
      galleryCaptions: ['Bento Study', 'Portion Cutaway', 'Cooler Included', 'Kids Bento Box'],
      optionsLabel: 'Choose Bento Set',
      options: [
        {
          id: 'junior-box',
          label: 'Junior Chicken Box',
          sublabel: '1 chicken + rice + cooler',
          priceCentavos: 13900,
          recipe: { chicken_cut: 1, jasmine_rice: 1, citrus_brew: 1, signature_sauce: 1, meal_packaging: 1 }
        },
        {
          id: 'explorer-box',
          label: 'Explorer Chicken + Fries Box',
          sublabel: '1 chicken + rice + fries + cooler',
          priceCentavos: 16900,
          recipe: { chicken_cut: 1, jasmine_rice: 1, potato_batch: 1, citrus_brew: 1, signature_sauce: 1, meal_packaging: 1 }
        }
      ]
    },
    {
      id: 'junior-cheeseburger-bento',
      name: 'Junior Cheeseburger Bento',
      category: 'Kids Meals',
      featured: false,
      shortDesc: 'Single brioche cheeseburger (no onions), sea-salt fries, and a small calamansi cooler.',
      longDesc: 'Our seared beef patty and melted cheddar on a soft brioche bun prepared mild without raw onions, paired with sea-salt fries and a fresh calamansi cooler.',
      galleryCaptions: ['Bento Study', 'Mild Burger Profile', 'Fries & Cooler', 'Kids Bento Box'],
      optionsLabel: 'Choose Bento Set',
      options: [
        {
          id: 'junior-burger-box',
          label: 'Junior Burger Box',
          sublabel: 'Burger + fries + cooler',
          priceCentavos: 14500,
          recipe: { brioche_bun: 1, beef_patty: 1, cheddar_slice: 1, potato_batch: 1, citrus_brew: 1, meal_packaging: 1 }
        },
        {
          id: 'explorer-burger-treat',
          label: 'Explorer Burger + Sundae Box',
          sublabel: 'Burger + fries + cooler + sweet cream',
          priceCentavos: 18500,
          recipe: { brioche_bun: 1, beef_patty: 1, cheddar_slice: 1, potato_batch: 1, citrus_brew: 1, sweet_cream: 1, meal_packaging: 1 }
        }
      ]
    }
  ];

  /* --------------------------------------------------------------------------
     6. Curated Value Pairings (Deals shown as a Typographic Ledger on Home)
     -------------------------------------------------------------------------- */
  var CURATED_PAIRINGS = [
    {
      id: 'pairing-01',
      number: '01',
      title: 'Solo Kitchen Trio',
      componentsText: 'Classic Cheese Burger (Single Patty) · Sea-Salt Crisp Fries (Medium) · Crispy Herb Chicken Meal (1-Piece)',
      noteText: 'Matched to the 3-item classic tray · 3 items',
      items: [
        { itemId: 'classic-cheese-burger', optionId: 'single-patty', quantity: 1 },
        { itemId: 'sea-salt-crisp-fries', optionId: 'medium', quantity: 1 },
        { itemId: 'crispy-herb-chicken-meal', optionId: '1pc-meal', quantity: 1 }
      ]
    },
    {
      id: 'pairing-02',
      number: '02',
      title: 'Twin Chicken & Rice Table Set',
      componentsText: '2× Crispy Herb Chicken Meal (1-Piece Meal) · 2× Pressed Calamansi & Mint Cooler (Regular)',
      noteText: 'Deducts 2 chicken, 2 rice, 2 sauce, 2 citrus brew & packaging',
      items: [
        { itemId: 'crispy-herb-chicken-meal', optionId: '1pc-meal', quantity: 2 },
        { itemId: 'calamansi-mint-cooler', optionId: 'regular', quantity: 2 }
      ]
    },
    {
      id: 'pairing-03',
      number: '03',
      title: 'Burger & Fries Counter Duo',
      componentsText: 'Classic Cheese Burger (Single Patty) · Sea-Salt Crisp Fries (Medium)',
      noteText: 'Quick weekday lunch pairing · 2 items',
      items: [
        { itemId: 'classic-cheese-burger', optionId: 'single-patty', quantity: 1 },
        { itemId: 'sea-salt-crisp-fries', optionId: 'medium', quantity: 1 }
      ]
    }
  ];

  /* --------------------------------------------------------------------------
     7. Exact Centavo Currency Formatting & VAT-Inclusive Math Engine
     -------------------------------------------------------------------------- */
  var phpFormatter = null;
  try {
    phpFormatter = new Intl.NumberFormat(BRAND_CONFIG.locale, {
      style: 'currency',
      currency: BRAND_CONFIG.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    phpFormatter = null;
  }

  function formatPHP(centavos) {
    var safeCentavos = Math.round(Number(centavos) || 0);
    var pesos = safeCentavos / 100;
    if (phpFormatter) {
      var formatted = phpFormatter.format(pesos);
      // Ensure the Philippine Peso sign ₱ is consistently rendered
      if (formatted.indexOf('PHP') !== -1) {
        return formatted.replace('PHP', '₱').replace(/\s+/g, '');
      }
      return formatted;
    }
    return '₱' + pesos.toFixed(2);
  }

  function calculateOrderTotals(cartLines, fulfillmentMode) {
    var mode = fulfillmentMode === 'pickup' ? 'pickup' : 'delivery';
    var lines = Array.isArray(cartLines) ? cartLines : [];
    var subtotalCentavos = 0;
    var totalQuantity = 0;

    var computedLines = lines.map(function (line) {
      var unitCentavos = Math.round(Number(line.unitPriceCentavos) || 0);
      var qty = Math.max(1, Math.min(BRAND_CONFIG.maxQuantityPerLine, Math.round(Number(line.quantity) || 1)));
      var lineTotalCentavos = unitCentavos * qty;
      subtotalCentavos += lineTotalCentavos;
      totalQuantity += qty;
      return {
        lineId: line.lineId || (line.itemId + '__' + line.optionId),
        itemId: line.itemId,
        name: line.name,
        category: line.category,
        optionId: line.optionId,
        optionLabel: line.optionLabel,
        unitPriceCentavos: unitCentavos,
        quantity: qty,
        lineTotalCentavos: lineTotalCentavos
      };
    });

    var deliveryFeeCentavos = ( computedLines.length > 0 && mode === 'delivery' )
      ? BRAND_CONFIG.deliveryFeeCentavos
      : 0;

    var totalCentavos = subtotalCentavos + deliveryFeeCentavos;
    // Philippine VAT-inclusive rule: included 12% VAT = total * 12 / 112 rounded to centavo
    var includedVatCentavos = Math.round(
      (totalCentavos * BRAND_CONFIG.vatRateNumerator) / BRAND_CONFIG.vatRateDenominator
    );
    var netOfVatCentavos = totalCentavos - includedVatCentavos;

    return {
      lines: computedLines,
      totalQuantity: totalQuantity,
      fulfillmentMode: mode,
      subtotalCentavos: subtotalCentavos,
      deliveryFeeCentavos: deliveryFeeCentavos,
      totalCentavos: totalCentavos,
      includedVatCentavos: includedVatCentavos,
      netOfVatCentavos: netOfVatCentavos
    };
  }

  /* --------------------------------------------------------------------------
     8. Safe Storage Wrapper & Cross-Tab Synchronization
     -------------------------------------------------------------------------- */
  var memoryFallbackState = null;
  var syncChannel = null;
  var stateListeners = [];

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(BRAND_CONFIG.channelName);
      syncChannel.onmessage = function (ev) {
        if (ev && ev.data && ev.data.type === 'STATE_UPDATED') {
          notifyListeners(ev.data.reason || 'broadcast');
        }
      };
    }
  } catch (err) {
    syncChannel = null;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', function (ev) {
      if (ev && ev.key === BRAND_CONFIG.storageKey) {
        notifyListeners('storage_event');
      }
    });
  }

  function notifyListeners(reason) {
    stateListeners.forEach(function (fn) {
      try {
        fn(reason);
      } catch (e) {
        // Ignore listener errors
      }
    });
  }

  function broadcastUpdate(reason) {
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'STATE_UPDATED', reason: reason, timestamp: Date.now() });
      } catch (e) {
        // Ignore broadcast errors
      }
    }
    notifyListeners(reason);
  }

  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function createSeedOrders() {
    var now = Date.now();
    var tunLines = [
      {
        lineId: 'classic-cheese-burger__single-patty',
        itemId: 'classic-cheese-burger',
        name: 'Classic Cheese Burger',
        category: 'Burgers',
        optionId: 'single-patty',
        optionLabel: 'Single Patty',
        unitPriceCentavos: 8900,
        quantity: 1,
        lineTotalCentavos: 8900
      },
      {
        lineId: 'sea-salt-crisp-fries__medium',
        itemId: 'sea-salt-crisp-fries',
        name: 'Sea-Salt Crisp Fries',
        category: 'Fries',
        optionId: 'medium',
        optionLabel: 'Medium',
        unitPriceCentavos: 9900,
        quantity: 1,
        lineTotalCentavos: 9900
      },
      {
        lineId: 'crispy-herb-chicken-meal__1pc-meal',
        itemId: 'crispy-herb-chicken-meal',
        name: 'Crispy Herb Chicken Meal',
        category: 'Chickens',
        optionId: '1pc-meal',
        optionLabel: '1-Piece Chicken Meal',
        unitPriceCentavos: 10900,
        quantity: 1,
        lineTotalCentavos: 10900
      }
    ];
    var tunTotals = calculateOrderTotals(tunLines, 'delivery');

    var binLines = [
      {
        lineId: 'crispy-herb-chicken-meal__1pc-meal',
        itemId: 'crispy-herb-chicken-meal',
        name: 'Crispy Herb Chicken Meal',
        category: 'Chickens',
        optionId: '1pc-meal',
        optionLabel: '1-Piece Chicken Meal',
        unitPriceCentavos: 10900,
        quantity: 2,
        lineTotalCentavos: 21800
      },
      {
        lineId: 'calamansi-mint-cooler__medium',
        itemId: 'calamansi-mint-cooler',
        name: 'Pressed Calamansi & Mint Cooler',
        category: 'Drinks',
        optionId: 'medium',
        optionLabel: 'Medium',
        unitPriceCentavos: 6900,
        quantity: 2,
        lineTotalCentavos: 13800
      }
    ];
    var binTotals = calculateOrderTotals(binLines, 'pickup');

    return [
      {
        orderId: 'TUN-2048',
        branchId: 'tunasan',
        branchName: 'Tunasan',
        fulfillmentMode: 'delivery',
        status: 'Preparing',
        createdAt: now - 6 * 60 * 1000,
        updatedAt: now - 3 * 60 * 1000,
        estimatedMinsRange: [25, 30],
        customer: {
          fullName: 'Andrea Villareal',
          phone: '0917 842 3310',
          address: '42 Acacia Lane, Lodora Village, Tunasan, Muntinlupa',
          landmark: 'Green gate beside the neighborhood bakery',
          pickupTime: ''
        },
        payment: {
          methodId: 'cash',
          methodLabel: 'Cash on delivery',
          isSimulated: false
        },
        lines: tunTotals.lines,
        totals: {
          subtotalCentavos: tunTotals.subtotalCentavos,
          deliveryFeeCentavos: tunTotals.deliveryFeeCentavos,
          totalCentavos: tunTotals.totalCentavos,
          includedVatCentavos: tunTotals.includedVatCentavos,
          netOfVatCentavos: tunTotals.netOfVatCentavos,
          totalQuantity: tunTotals.totalQuantity
        },
        deductedIngredients: {
          brioche_bun: 1,
          beef_patty: 1,
          cheddar_slice: 1,
          potato_batch: 2,
          chicken_cut: 1,
          jasmine_rice: 1,
          signature_sauce: 3,
          meal_packaging: 3
        },
        history: [
          { status: 'Order received', timestamp: now - 6 * 60 * 1000, note: 'Placed by guest via web ordering' },
          { status: 'Preparing', timestamp: now - 3 * 60 * 1000, note: 'Accepted by Mara Santos (Tunasan Cashier)' }
        ]
      },
      {
        orderId: 'BIN-2049',
        branchId: 'binan',
        branchName: 'Biñan',
        fulfillmentMode: 'pickup',
        status: 'Order received',
        createdAt: now - 2 * 60 * 1000,
        updatedAt: now - 2 * 60 * 1000,
        estimatedMinsRange: [15, 20],
        customer: {
          fullName: 'Carlos Mendoza',
          phone: '0918 550 1924',
          address: '',
          landmark: '',
          pickupTime: 'As soon as ready (15–20 min)'
        },
        payment: {
          methodId: 'ewallet_demo',
          methodLabel: 'E-Wallet (Simulated Demo)',
          isSimulated: true
        },
        lines: binTotals.lines,
        totals: {
          subtotalCentavos: binTotals.subtotalCentavos,
          deliveryFeeCentavos: binTotals.deliveryFeeCentavos,
          totalCentavos: binTotals.totalCentavos,
          includedVatCentavos: binTotals.includedVatCentavos,
          netOfVatCentavos: binTotals.netOfVatCentavos,
          totalQuantity: binTotals.totalQuantity
        },
        deductedIngredients: {
          chicken_cut: 2,
          jasmine_rice: 2,
          signature_sauce: 2,
          citrus_brew: 4,
          meal_packaging: 4
        },
        history: [
          { status: 'Order received', timestamp: now - 2 * 60 * 1000, note: 'Placed by guest for counter pick-up' }
        ]
      }
    ];
  }

  function createDefaultState() {
    return {
      version: 1,
      selectedBranchId: 'tunasan',
      fulfillmentMode: 'delivery',
      cartLines: [],
      checkoutDraft: {
        fullName: '',
        phone: '',
        address: '',
        landmark: '',
        pickupTime: 'As soon as ready (15–20 min)',
        paymentMethod: 'cash'
      },
      lastOrderId: 'TUN-2048',
      orderSequence: {
        tunasan: 2048,
        binan: 2049
      },
      inventory: cloneDeep(INITIAL_BRANCH_INVENTORY),
      orders: createSeedOrders(),
      deductionLog: [
        {
          orderId: 'BIN-2049',
          branchId: 'binan',
          timestamp: Date.now() - 2 * 60 * 1000,
          summary: '2× Crispy Herb Chicken Meal + 2× Calamansi Cooler deducted 2 chicken, 2 rice, 2 sauce, 4 citrus brew, 4 packaging'
        },
        {
          orderId: 'TUN-2048',
          branchId: 'tunasan',
          timestamp: Date.now() - 6 * 60 * 1000,
          summary: '1× Cheese Burger, 1× Medium Fries, 1× Chicken Meal deducted 1 patty, 1 bun, 2 potato, 1 chicken, 1 rice, 3 sauce, 3 packaging'
        }
      ],
      staffSession: null
    };
  }

  function readState() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(BRAND_CONFIG.storageKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.version === 1 && parsed.inventory && parsed.orders) {
            memoryFallbackState = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      // Blocked or corrupted localStorage: recover safely with memoryFallbackState
    }
    if (!memoryFallbackState) {
      memoryFallbackState = createDefaultState();
      writeState(memoryFallbackState, 'seed_init');
    }
    return cloneDeep(memoryFallbackState);
  }

  function writeState(nextState, reason) {
    memoryFallbackState = cloneDeep(nextState);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BRAND_CONFIG.storageKey, JSON.stringify(memoryFallbackState));
      }
    } catch (e) {
      // Storage quota or security restriction: keep running seamlessly in memoryFallbackState
    }
    broadcastUpdate(reason || 'mutation');
  }

  /* --------------------------------------------------------------------------
     9. Stock & Recipe Calculation Helpers
     -------------------------------------------------------------------------- */
  function computeMaxOrderableForRecipe(recipe, branchStock) {
    if (!recipe || !branchStock) return 0;
    var maxPossible = BRAND_CONFIG.maxQuantityPerLine;
    var keys = Object.keys(recipe);
    for (var i = 0; i < keys.length; i++) {
      var ingId = keys[i];
      var requiredPerUnit = Number(recipe[ingId]) || 0;
      if (requiredPerUnit > 0) {
        var availableUnits = Number(branchStock[ingId]) || 0;
        var canMake = Math.floor(availableUnits / requiredPerUnit);
        if (canMake < maxPossible) {
          maxPossible = canMake;
        }
      }
    }
    return Math.max(0, maxPossible);
  }

  function getDepletedIngredientNames(recipe, branchStock) {
    var missing = [];
    if (!recipe || !branchStock) return missing;
    Object.keys(recipe).forEach(function (ingId) {
      var needed = Number(recipe[ingId]) || 0;
      var stock = Number(branchStock[ingId]) || 0;
      if (needed > stock) {
        var meta = INGREDIENT_CATALOG[ingId];
        missing.push(meta ? meta.name : ingId);
      }
    });
    return missing;
  }

  function enrichMenuItemForBranch(item, branchId, state) {
    var branchStock = (state.inventory && state.inventory[branchId]) || {};
    var enrichedOptions = item.options.map(function (opt) {
      var maxQty = computeMaxOrderableForRecipe(opt.recipe, branchStock);
      var missingNames = maxQty === 0 ? getDepletedIngredientNames(opt.recipe, branchStock) : [];
      var recipeList = Object.keys(opt.recipe).map(function (ingId) {
        var meta = INGREDIENT_CATALOG[ingId];
        return {
          id: ingId,
          name: meta ? meta.name : ingId,
          unit: meta ? meta.unit : 'units',
          qtyRequired: opt.recipe[ingId],
          branchRemaining: Number(branchStock[ingId]) || 0
        };
      });
      return {
        id: opt.id,
        label: opt.label,
        sublabel: opt.sublabel,
        priceCentavos: opt.priceCentavos,
        recipe: cloneDeep(opt.recipe),
        recipeDetails: recipeList,
        available: maxQty > 0,
        maxOrderableQty: maxQty,
        missingIngredients: missingNames
      };
    });

    var anyAvailable = enrichedOptions.some(function (o) { return o.available; });
    var firstAvailableOption = enrichedOptions.find(function (o) { return o.available; }) || enrichedOptions[0];

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      featured: item.featured,
      shortDesc: item.shortDesc,
      longDesc: item.longDesc,
      galleryCaptions: item.galleryCaptions.slice(),
      optionsLabel: item.optionsLabel,
      options: enrichedOptions,
      available: anyAvailable,
      startingPriceCentavos: firstAvailableOption.priceCentavos,
      defaultOptionId: firstAvailableOption.id
    };
  }

  function getStatusesForMode(mode) {
    if (mode === 'pickup') {
      return ['Order received', 'Preparing', 'Ready for pick-up', 'Picked up'];
    }
    return ['Order received', 'Preparing', 'Out for delivery', 'Delivered'];
  }

  function computeEstimatedRange(mode, totalQty) {
    var qty = Number(totalQty) || 1;
    var extra = Math.min(15, Math.floor(qty / 3) * 4);
    if (mode === 'pickup') {
      return [12 + extra, 18 + extra];
    }
    return [25 + extra, 30 + extra];
  }

  /* --------------------------------------------------------------------------
     10. Public Promise-Based Data Layer API
     -------------------------------------------------------------------------- */
  var RestoApi = {
    getConfig: function () {
      return cloneDeep(BRAND_CONFIG);
    },

    getBranches: function () {
      return Promise.resolve(cloneDeep(BRANCHES));
    },

    getBranchById: function (branchId) {
      var found = BRANCHES.find(function (b) { return b.id === branchId; }) || BRANCHES[0];
      return cloneDeep(found);
    },

    getCategories: function () {
      return MENU_CATEGORIES.slice();
    },

    getCuratedPairings: function (branchId) {
      var state = readState();
      var targetBranch = branchId || state.selectedBranchId;
      var enrichedMenu = MENU_ITEMS.map(function (it) {
        return enrichMenuItemForBranch(it, targetBranch, state);
      });

      var pairings = CURATED_PAIRINGS.map(function (p) {
        var totalCentavos = 0;
        var allAvailable = true;
        p.items.forEach(function (entry) {
          var dish = enrichedMenu.find(function (m) { return m.id === entry.itemId; });
          if (!dish) {
            allAvailable = false;
            return;
          }
          var opt = dish.options.find(function (o) { return o.id === entry.optionId; }) || dish.options[0];
          if (!opt || opt.maxOrderableQty < entry.quantity) {
            allAvailable = false;
          }
          if (opt) {
            totalCentavos += opt.priceCentavos * entry.quantity;
          }
        });
        return {
          id: p.id,
          number: p.number,
          title: p.title,
          componentsText: p.componentsText,
          noteText: p.noteText,
          priceCentavos: totalCentavos,
          available: allAvailable,
          items: cloneDeep(p.items)
        };
      });

      return Promise.resolve(pairings);
    },

    getMenu: function (branchId) {
      var state = readState();
      var targetBranch = branchId || state.selectedBranchId;
      var items = MENU_ITEMS.map(function (item) {
        return enrichMenuItemForBranch(item, targetBranch, state);
      });
      return Promise.resolve(items);
    },

    getMenuItem: function (itemId, branchId) {
      var state = readState();
      var targetBranch = branchId || state.selectedBranchId;
      var found = MENU_ITEMS.find(function (item) { return item.id === itemId; });
      if (!found) return Promise.resolve(null);
      return Promise.resolve(enrichMenuItemForBranch(found, targetBranch, state));
    },

    getBranchInventory: function (branchId) {
      var state = readState();
      var targetBranch = branchId || state.selectedBranchId;
      var stockMap = (state.inventory && state.inventory[targetBranch]) || {};
      var list = Object.keys(INGREDIENT_CATALOG).map(function (ingId) {
        var meta = INGREDIENT_CATALOG[ingId];
        return {
          id: ingId,
          name: meta.name,
          unit: meta.unit,
          quantity: Number(stockMap[ingId]) || 0
        };
      });
      var branchLogs = (state.deductionLog || []).filter(function (entry) {
        return entry.branchId === targetBranch;
      });
      return Promise.resolve({
        branchId: targetBranch,
        items: list,
        deductionLog: branchLogs
      });
    },

    getSessionState: function () {
      var state = readState();
      var branch = RestoApi.getBranchById(state.selectedBranchId);
      var totals = calculateOrderTotals(state.cartLines, state.fulfillmentMode);
      return {
        selectedBranchId: state.selectedBranchId,
        selectedBranch: branch,
        fulfillmentMode: state.fulfillmentMode,
        cartLines: totals.lines,
        totals: totals,
        checkoutDraft: cloneDeep(state.checkoutDraft || {}),
        lastOrderId: state.lastOrderId,
        staffSession: cloneDeep(state.staffSession)
      };
    },

    setFulfillmentMode: function (mode) {
      var state = readState();
      state.fulfillmentMode = mode === 'pickup' ? 'pickup' : 'delivery';
      writeState(state, 'fulfillment_mode');
      return Promise.resolve(RestoApi.getSessionState());
    },

    setBranch: function (branchId, clearCartIfOccupied) {
      var state = readState();
      var validBranch = BRANCHES.find(function (b) { return b.id === branchId; });
      if (!validBranch) {
        return Promise.reject(new Error('Unknown branch selected.'));
      }
      if (state.selectedBranchId !== branchId) {
        if (state.cartLines.length > 0 && !clearCartIfOccupied) {
          return Promise.resolve({
            requiresConfirmation: true,
            currentBranch: RestoApi.getBranchById(state.selectedBranchId),
            targetBranch: cloneDeep(validBranch),
            cartItemCount: state.cartLines.length
          });
        }
        state.selectedBranchId = branchId;
        if (clearCartIfOccupied) {
          state.cartLines = [];
        }
        writeState(state, 'branch_switch');
      }
      return Promise.resolve({
        requiresConfirmation: false,
        session: RestoApi.getSessionState()
      });
    },

    addToCart: function (itemId, optionId, quantityToAdd) {
      var state = readState();
      var dish = MENU_ITEMS.find(function (m) { return m.id === itemId; });
      if (!dish) return Promise.reject(new Error('Menu item not found.'));

      var enriched = enrichMenuItemForBranch(dish, state.selectedBranchId, state);
      var opt = enriched.options.find(function (o) { return o.id === optionId; }) || enriched.options[0];
      if (!opt || !opt.available) {
        return Promise.reject(new Error('This item option is currently out of stock at ' + state.selectedBranchId + '.'));
      }

      var lineId = dish.id + '__' + opt.id;
      var existingIndex = state.cartLines.findIndex(function (l) { return l.lineId === lineId; });
      var addQty = Math.max(1, Math.round(Number(quantityToAdd) || 1));

      if (existingIndex !== -1) {
        var nextQty = Math.min(
          BRAND_CONFIG.maxQuantityPerLine,
          opt.maxOrderableQty,
          state.cartLines[existingIndex].quantity + addQty
        );
        state.cartLines[existingIndex].quantity = nextQty;
        state.cartLines[existingIndex].lineTotalCentavos = nextQty * opt.priceCentavos;
      } else {
        var initialQty = Math.min(BRAND_CONFIG.maxQuantityPerLine, opt.maxOrderableQty, addQty);
        state.cartLines.push({
          lineId: lineId,
          itemId: dish.id,
          name: dish.name,
          category: dish.category,
          optionId: opt.id,
          optionLabel: opt.label,
          unitPriceCentavos: opt.priceCentavos,
          quantity: initialQty,
          lineTotalCentavos: initialQty * opt.priceCentavos
        });
      }

      writeState(state, 'cart_add');
      return Promise.resolve(RestoApi.getSessionState());
    },

    updateCartLineQuantity: function (lineId, nextQuantity) {
      var state = readState();
      var idx = state.cartLines.findIndex(function (l) { return l.lineId === lineId; });
      if (idx === -1) return Promise.resolve(RestoApi.getSessionState());

      var line = state.cartLines[idx];
      var qty = Math.round(Number(nextQuantity) || 0);

      if (qty <= 0) {
        var removedLine = cloneDeep(line);
        state.cartLines.splice(idx, 1);
        writeState(state, 'cart_remove');
        return Promise.resolve({
          removedLine: removedLine,
          removedIndex: idx,
          session: RestoApi.getSessionState()
        });
      }

      var dish = MENU_ITEMS.find(function (m) { return m.id === line.itemId; });
      var maxAllowed = BRAND_CONFIG.maxQuantityPerLine;
      if (dish) {
        var enriched = enrichMenuItemForBranch(dish, state.selectedBranchId, state);
        var opt = enriched.options.find(function (o) { return o.id === line.optionId; });
        if (opt) {
          maxAllowed = Math.min(maxAllowed, Math.max(1, opt.maxOrderableQty));
        }
      }

      var clampedQty = Math.max(1, Math.min(maxAllowed, qty));
      state.cartLines[idx].quantity = clampedQty;
      state.cartLines[idx].lineTotalCentavos = clampedQty * state.cartLines[idx].unitPriceCentavos;
      writeState(state, 'cart_qty');
      return Promise.resolve({
        removedLine: null,
        session: RestoApi.getSessionState()
      });
    },

    restoreCartLine: function (removedLine, targetIndex) {
      var state = readState();
      if (!removedLine || !removedLine.lineId) return Promise.resolve(RestoApi.getSessionState());
      var existing = state.cartLines.findIndex(function (l) { return l.lineId === removedLine.lineId; });
      if (existing === -1) {
        var insertAt = typeof targetIndex === 'number'
          ? Math.max(0, Math.min(state.cartLines.length, targetIndex))
          : state.cartLines.length;
        state.cartLines.splice(insertAt, 0, cloneDeep(removedLine));
        writeState(state, 'cart_restore');
      }
      return Promise.resolve(RestoApi.getSessionState());
    },

    saveCheckoutDraft: function (draftPatch) {
      var state = readState();
      state.checkoutDraft = Object.assign({}, state.checkoutDraft || {}, draftPatch || {});
      writeState(state, 'checkout_draft');
      return Promise.resolve(cloneDeep(state.checkoutDraft));
    },

    createOrder: function (payload) {
      var state = readState();
      var branchId = state.selectedBranchId;
      var branch = RestoApi.getBranchById(branchId);
      var mode = state.fulfillmentMode === 'pickup' ? 'pickup' : 'delivery';
      var totals = calculateOrderTotals(state.cartLines, mode);

      if (!totals.lines.length) {
        return Promise.reject(new Error('Your cart is empty. Please add at least one item before placing an order.'));
      }

      // 1. Aggregate total recipe ingredients needed across all lines in the order
      var requiredIngredients = {};
      for (var i = 0; i < totals.lines.length; i++) {
        var line = totals.lines[i];
        var dish = MENU_ITEMS.find(function (m) { return m.id === line.itemId; });
        if (!dish) {
          return Promise.reject(new Error('Item "' + line.name + '" is no longer valid.'));
        }
        var opt = dish.options.find(function (o) { return o.id === line.optionId; }) || dish.options[0];
        var recipe = (opt && opt.recipe) || {};
        Object.keys(recipe).forEach(function (ingId) {
          requiredIngredients[ingId] = (requiredIngredients[ingId] || 0) + (recipe[ingId] * line.quantity);
        });
      }

      // 2. Verify branch inventory has sufficient stock
      var branchStock = state.inventory[branchId] || {};
      var shortageList = [];
      Object.keys(requiredIngredients).forEach(function (ingId) {
        var needed = requiredIngredients[ingId];
        var available = Number(branchStock[ingId]) || 0;
        if (needed > available) {
          var meta = INGREDIENT_CATALOG[ingId];
          shortageList.push((meta ? meta.name : ingId) + ' (needs ' + needed + ', ' + available + ' left)');
        }
      });

      if (shortageList.length > 0) {
        return Promise.reject(new Error('Insufficient stock at ' + branch.name + ' Branch: ' + shortageList.join(', ') + '.'));
      }

      // 3. Deduct recipe ingredients from that branch's inventory
      Object.keys(requiredIngredients).forEach(function (ingId) {
        branchStock[ingId] = Math.max(0, (Number(branchStock[ingId]) || 0) - requiredIngredients[ingId]);
      });
      state.inventory[branchId] = branchStock;

      // 4. Generate branch-prefixed sequential order number (e.g., TUN-2049, BIN-2050)
      var nextSeq = ((state.orderSequence && state.orderSequence[branchId]) || 2048) + 1;
      state.orderSequence[branchId] = nextSeq;
      var orderId = branch.prefix + '-' + nextSeq;

      var now = Date.now();
      var paymentMethodId = (payload && payload.paymentMethod === 'ewallet_demo') ? 'ewallet_demo' : 'cash';
      var paymentLabel = paymentMethodId === 'ewallet_demo'
        ? 'E-Wallet (Simulated Demo)'
        : (mode === 'pickup' ? 'Cash at counter' : 'Cash on delivery');

      var newOrder = {
        orderId: orderId,
        branchId: branchId,
        branchName: branch.name,
        fulfillmentMode: mode,
        status: 'Order received',
        createdAt: now,
        updatedAt: now,
        estimatedMinsRange: computeEstimatedRange(mode, totals.totalQuantity),
        customer: {
          fullName: String((payload && payload.fullName) || '').trim(),
          phone: String((payload && payload.phone) || '').trim(),
          address: mode === 'delivery' ? String((payload && payload.address) || '').trim() : '',
          landmark: mode === 'delivery' ? String((payload && payload.landmark) || '').trim() : '',
          pickupTime: mode === 'pickup' ? String((payload && payload.pickupTime) || 'As soon as ready (15–20 min)').trim() : ''
        },
        payment: {
          methodId: paymentMethodId,
          methodLabel: paymentLabel,
          isSimulated: paymentMethodId === 'ewallet_demo'
        },
        lines: totals.lines,
        totals: {
          subtotalCentavos: totals.subtotalCentavos,
          deliveryFeeCentavos: totals.deliveryFeeCentavos,
          totalCentavos: totals.totalCentavos,
          includedVatCentavos: totals.includedVatCentavos,
          netOfVatCentavos: totals.netOfVatCentavos,
          totalQuantity: totals.totalQuantity
        },
        deductedIngredients: requiredIngredients,
        history: [
          {
            status: 'Order received',
            timestamp: now,
            note: 'Order placed by guest (' + (mode === 'pickup' ? 'Pick-up' : 'Delivery') + ')'
          }
        ]
      };

      // Record human-readable deduction audit log
      var deductionParts = Object.keys(requiredIngredients).map(function (ingId) {
        var meta = INGREDIENT_CATALOG[ingId];
        return requiredIngredients[ingId] + ' ' + (meta ? meta.name : ingId);
      });

      state.deductionLog.unshift({
        orderId: orderId,
        branchId: branchId,
        timestamp: now,
        summary: 'Deducted ' + deductionParts.join(', ')
      });

      state.orders.unshift(newOrder);
      state.cartLines = [];
      state.lastOrderId = orderId;
      writeState(state, 'order_created');

      return Promise.resolve(cloneDeep(newOrder));
    },

    getOrder: function (orderId) {
      var state = readState();
      var targetId = String(orderId || state.lastOrderId || '').trim().toUpperCase();
      if (!targetId) return Promise.resolve(null);
      var found = state.orders.find(function (o) {
        return String(o.orderId).toUpperCase() === targetId;
      });
      return Promise.resolve(found ? cloneDeep(found) : null);
    },

    listAllOrders: function () {
      var state = readState();
      return Promise.resolve(cloneDeep(state.orders || []));
    },

    listOrdersByBranch: function (branchId) {
      var state = readState();
      var filtered = (state.orders || []).filter(function (o) {
        return o.branchId === branchId;
      });
      return Promise.resolve(cloneDeep(filtered));
    },

    updateOrderStatus: function (orderId, nextStatus, actorLabel) {
      var state = readState();
      var targetId = String(orderId || '').trim().toUpperCase();
      var idx = state.orders.findIndex(function (o) {
        return String(o.orderId).toUpperCase() === targetId;
      });
      if (idx === -1) {
        return Promise.reject(new Error('Order ' + orderId + ' not found.'));
      }

      var order = state.orders[idx];
      var validSteps = getStatusesForMode(order.fulfillmentMode);
      if (validSteps.indexOf(nextStatus) === -1) {
        return Promise.reject(new Error('Invalid status "' + nextStatus + '" for ' + order.fulfillmentMode + ' order.'));
      }

      var now = Date.now();
      order.status = nextStatus;
      order.updatedAt = now;
      order.history = order.history || [];
      order.history.push({
        status: nextStatus,
        timestamp: now,
        note: actorLabel ? ('Updated by ' + actorLabel) : 'Updated by branch staff'
      });

      writeState(state, 'order_status_updated');
      return Promise.resolve(cloneDeep(order));
    },

    getDemoStaffAccounts: function () {
      return cloneDeep(DEMO_STAFF_ACCOUNTS);
    },

    signInStaff: function (username, passcode) {
      var state = readState();
      var cleanUser = String(username || '').trim().toLowerCase();
      var cleanPass = String(passcode || '').trim();
      var account = DEMO_STAFF_ACCOUNTS.find(function (acc) {
        return acc.username.toLowerCase() === cleanUser && acc.passcode === cleanPass;
      });
      if (!account) {
        return Promise.reject(new Error('Unrecognized demo credentials. Select a demo cashier profile or enter passcode 1234.'));
      }
      state.staffSession = cloneDeep(account);
      writeState(state, 'staff_signin');
      return Promise.resolve(cloneDeep(account));
    },

    signOutStaff: function () {
      var state = readState();
      state.staffSession = null;
      writeState(state, 'staff_signout');
      return Promise.resolve(null);
    },

    resetDemoData: function () {
      var fresh = createDefaultState();
      writeState(fresh, 'demo_reset');
      return Promise.resolve(RestoApi.getSessionState());
    },

    onStateChange: function (listener) {
      if (typeof listener === 'function') {
        stateListeners.push(listener);
      }
      return function unsubscribe() {
        var idx = stateListeners.indexOf(listener);
        if (idx !== -1) stateListeners.splice(idx, 1);
      };
    },

    formatPHP: formatPHP,
    calculateOrderTotals: calculateOrderTotals,
    getStatusesForMode: getStatusesForMode,
    INGREDIENT_CATALOG: cloneDeep(INGREDIENT_CATALOG)
  };

  global.RestoData = RestoApi;
})(window);
