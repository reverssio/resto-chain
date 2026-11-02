/* ==========================================================================
   Luntian Kitchen — Customer Ordering Flow & Cashier Queue Application
   Plain JavaScript (Zero frameworks, zero innerHTML with untrusted data)
   ========================================================================== */

(function (global) {
  'use strict';

  var Data = global.RestoData;
  var Art = global.RestoIllustrations;

  /* --------------------------------------------------------------------------
     Application View State
     -------------------------------------------------------------------------- */
  var appState = {
    route: 'home',         /* 'home' | 'menu' | 'item' | 'cart' | 'checkout' | 'confirmation' | 'tracking' | 'staff' */
    routeParam: '',        /* itemId or orderId */
    activeCategory: 'Burgers',
    menuSearchQuery: '',
    detailSelectedOptionId: '',
    detailQuantity: 1,
    detailGalleryIndex: 0,
    undoRemovedLine: null,
    undoRemovedIndex: 0,
    undoTimerId: null,
    pendingBranchSwitch: null,
    checkoutErrors: {},
    isSubmittingOrder: false,
    trackingLookupInput: '',
    trackingDetailsExpanded: true,
    staffActiveTab: 'queue', /* 'queue' | 'completed' | 'inventory' */
    staffLoginError: ''
  };

  /* --------------------------------------------------------------------------
     Safe DOM Construction Helper (Prevents XSS by using textContent)
     -------------------------------------------------------------------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === undefined || val === null || val === false) return;
        if (key === 'className') {
          node.className = String(val);
        } else if (key === 'text') {
          node.textContent = String(val);
        } else if (key === 'style' && typeof val === 'object') {
          Object.keys(val).forEach(function (stKey) {
            node.style[stKey] = String(val[stKey]);
          });
        } else if (key.indexOf('on') === 0 && typeof val === 'function') {
          var eventName = key.slice(2).toLowerCase();
          node.addEventListener(eventName, val);
        } else if (val === true) {
          node.setAttribute(key, '');
        } else {
          node.setAttribute(key, String(val));
        }
      });
    }
    if (children !== undefined && children !== null) {
      appendChildren(node, children);
    }
    return node;
  }

  function appendChildren(parent, children) {
    if (Array.isArray(children)) {
      children.forEach(function (c) {
        appendChildren(parent, c);
      });
    } else if (children instanceof Node) {
      parent.appendChild(children);
    } else if (typeof children === 'string' || typeof children === 'number') {
      parent.appendChild(document.createTextNode(String(children)));
    }
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  /* --------------------------------------------------------------------------
     Motion & Transition Utilities
     -------------------------------------------------------------------------- */
  function prefersReducedMotion() {
    return Boolean(
      global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function runWithViewTransition(updateDomFn, enableSharedTransition) {
    if (enableSharedTransition && !prefersReducedMotion() && typeof document.startViewTransition === 'function') {
      try {
        var vt = document.startViewTransition(function () {
          updateDomFn();
        });
        if (vt && vt.finished && typeof vt.finished.catch === 'function') {
          vt.finished.catch(function () {});
        }
        if (vt && vt.ready && typeof vt.ready.catch === 'function') {
          vt.ready.catch(function () {});
        }
        return;
      } catch (e) {
        // Fallback if startViewTransition fails
      }
    }
    updateDomFn();
  }

  function launchFlyingCartToken(sourceElement) {
    var cartBtn = document.getElementById('header-cart-btn');
    if (prefersReducedMotion()) {
      if (cartBtn) {
        cartBtn.classList.remove('bump');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bump');
      }
      return;
    }
    if (!sourceElement || !cartBtn || typeof sourceElement.getBoundingClientRect !== 'function') return;

    var srcRect = sourceElement.getBoundingClientRect();
    var destRect = cartBtn.getBoundingClientRect();

    var token = el('div', { className: 'flying-token', 'aria-hidden': 'true' });
    var startX = srcRect.left + srcRect.width / 2 - 9;
    var startY = srcRect.top + srcRect.height / 2 - 9;
    var endX = destRect.left + destRect.width / 2 - 9;
    var endY = destRect.top + destRect.height / 2 - 9;

    token.style.left = startX + 'px';
    token.style.top = startY + 'px';
    document.body.appendChild(token);

    if (typeof token.animate === 'function') {
      var anim = token.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: 'translate(' + ((endX - startX) * 0.5) + 'px, ' + (Math.min(startY, endY) - startY - 36) + 'px) scale(0.85)', opacity: 0.9 },
        { transform: 'translate(' + (endX - startX) + 'px, ' + (endY - startY) + 'px) scale(0.35)', opacity: 0.2 }
      ], {
        duration: 420,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      });
      anim.onfinish = function () {
        if (token.parentNode) token.parentNode.removeChild(token);
        cartBtn.classList.remove('bump');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bump');
      };
    } else {
      if (token.parentNode) token.parentNode.removeChild(token);
    }
  }

  function announceToScreenReader(message) {
    var liveRegion = document.getElementById('sr-live-announcer');
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(function () {
        liveRegion.textContent = String(message);
      }, 30);
    }
  }

  /* --------------------------------------------------------------------------
     Router & Navigation
     -------------------------------------------------------------------------- */
  function navigateTo(route, param, skipHashUpdate) {
    var cleanRoute = route || 'home';
    var cleanParam = param ? String(param) : '';

    var prevRoute = appState.route;
    appState.route = cleanRoute;
    appState.routeParam = cleanParam;
    appState.checkoutErrors = {};

    var isSharedDishTransition =
      (prevRoute === 'menu' && cleanRoute === 'item') ||
      (prevRoute === 'item' && cleanRoute === 'menu');

    if (cleanRoute === 'item' && cleanParam) {
      appState.detailGalleryIndex = 0;
      appState.detailQuantity = 1;
      Data.getMenuItem(cleanParam).then(function (dish) {
        if (dish) {
          appState.detailSelectedOptionId = dish.defaultOptionId;
        }
        renderApp(isSharedDishTransition);
      });
    } else {
      renderApp(isSharedDishTransition);
    }

    if (!skipHashUpdate) {
      var nextHash = '#' + cleanRoute + (cleanParam ? '/' + encodeURIComponent(cleanParam) : '');
      if (global.location.hash !== nextHash) {
        try {
          global.history.pushState(null, '', nextHash);
        } catch (e) {
          global.location.hash = nextHash;
        }
      }
    }

    global.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function parseHashAndRoute() {
    var rawHash = (global.location.hash || '#home').replace(/^#/, '');
    var parts = rawHash.split('/');
    var route = parts[0] || 'home';
    var param = parts.slice(1).map(decodeURIComponent).join('/');
    var allowedRoutes = ['home', 'menu', 'item', 'cart', 'checkout', 'confirmation', 'tracking', 'staff'];
    if (allowedRoutes.indexOf(route) === -1) {
      route = 'home';
      param = '';
    }
    navigateTo(route, param, true);
  }

  /* --------------------------------------------------------------------------
     Reusable Sliding Segmented Control Builder
     -------------------------------------------------------------------------- */
  function createSegmentedControl(options, selectedId, onSelect, ariaLabel) {
    var cols = Math.min(3, Math.max(2, options.length));
    var selectedIdx = Math.max(0, options.findIndex(function (o) { return o.id === selectedId; }));

    var container = el('div', {
      className: 'segmented-control',
      'data-cols': String(cols),
      role: 'radiogroup',
      'aria-label': ariaLabel || 'Select option'
    });

    var slider = el('div', {
      className: 'segmented-slider',
      'aria-hidden': 'true',
      style: {
        width: 'calc((100% - 0.5rem - ' + ((cols - 1) * 0.25) + 'rem) / ' + cols + ')',
        transform: 'translateX(calc(' + selectedIdx + ' * (100% + 0.25rem)))'
      }
    });

    if (options.length === 1 || (global.innerWidth <= 680 && cols === 3)) {
      slider.style.display = 'none';
    }

    container.appendChild(slider);

    options.forEach(function (opt) {
      var isSelected = opt.id === selectedId;
      var btn = el('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': isSelected ? 'true' : 'false',
        disabled: Boolean(opt.disabled),
        className: 'segmented-option' + (isSelected ? ' is-selected' : ''),
        onclick: function () {
          if (!opt.disabled && opt.id !== selectedId) {
            onSelect(opt.id);
          }
        }
      }, [
        el('span', { className: 'segmented-option-title' }, [
          el('span', { text: opt.label }),
          opt.rightText ? el('span', { className: 'tabular', text: opt.rightText }) : null
        ]),
        opt.sublabel ? el('span', { className: 'segmented-option-sub', text: opt.sublabel }) : null
      ]);
      container.appendChild(btn);
    });

    return container;
  }

  /* --------------------------------------------------------------------------
     Branch Switch Guard Handler
     -------------------------------------------------------------------------- */
  function requestBranchSwitch(targetBranchId) {
    Data.setBranch(targetBranchId, false).then(function (res) {
      if (res.requiresConfirmation) {
        appState.pendingBranchSwitch = res;
        renderModalHost();
      } else {
        announceToScreenReader('Switched active branch to ' + res.session.selectedBranch.name);
        renderApp(false);
      }
    });
  }

  function renderModalHost() {
    var modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    clearNode(modalRoot);

    if (!appState.pendingBranchSwitch) return;
    var info = appState.pendingBranchSwitch;

    var dialog = el('div', {
      className: 'modal-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'branch-switch-dialog-title'
    }, [
      el('div', { className: 'modal-dialog' }, [
        el('h2', {
          id: 'branch-switch-dialog-title',
          className: 'section-heading',
          text: 'Switch branch to ' + info.targetBranch.name + '?'
        }),
        el('p', {
          className: 'body-text',
          text: 'Your cart currently holds ' + info.cartItemCount + (info.cartItemCount === 1 ? ' item' : ' items') + ' prepared from ' + info.currentBranch.name + ' Branch inventory. Because each branch maintains its own live ingredient stock and order numbering (' + info.targetBranch.prefix + '-XXXX), switching branches will clear your current cart.'
        }),
        el('div', {
          style: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }
        }, [
          el('button', {
            type: 'button',
            className: 'btn-surface',
            text: 'Keep ' + info.currentBranch.name + ' Branch',
            onclick: function () {
              appState.pendingBranchSwitch = null;
              renderModalHost();
            }
          }),
          el('button', {
            type: 'button',
            className: 'btn-primary',
            text: 'Switch to ' + info.targetBranch.name + ' & Clear Cart',
            onclick: function () {
              Data.setBranch(info.targetBranch.id, true).then(function () {
                appState.pendingBranchSwitch = null;
                appState.undoRemovedLine = null;
                renderModalHost();
                announceToScreenReader('Switched to ' + info.targetBranch.name + ' Branch and cleared cart.');
                renderApp(false);
              });
            }
          })
        ])
      ])
    ]);

    modalRoot.appendChild(dialog);
  }

  /* --------------------------------------------------------------------------
     Header & Footer Rendering
     -------------------------------------------------------------------------- */
  function renderHeader(session) {
    var headerRoot = document.getElementById('site-header-root');
    if (!headerRoot) return;
    clearNode(headerRoot);

    var config = Data.getConfig();
    var modeLabel = session.fulfillmentMode === 'pickup' ? 'Pick-up' : 'Delivery';

    var brandLink = el('a', {
      href: '#home',
      className: 'brand-link',
      onclick: function (e) {
        e.preventDefault();
        navigateTo('home');
      }
    }, [
      Art.createBrandEmblemSvg(),
      el('span', { text: config.brandName })
    ]);

    var navItems = [
      { id: 'home', label: 'Home' },
      { id: 'menu', label: 'Menu' },
      { id: 'tracking', label: 'Track Order' },
      { id: 'staff', label: 'Cashier Queue' }
    ];

    var nav = el('nav', { className: 'primary-nav', 'aria-label': 'Primary navigation' },
      navItems.map(function (item) {
        var isCurrent = appState.route === item.id || (item.id === 'menu' && appState.route === 'item');
        return el('a', {
          href: '#' + item.id,
          className: 'nav-link',
          'aria-current': isCurrent ? 'page' : null,
          text: item.label,
          onclick: function (e) {
            e.preventDefault();
            navigateTo(item.id);
          }
        });
      })
    );

    var otherBranchId = session.selectedBranchId === 'tunasan' ? 'binan' : 'tunasan';
    var branchSwitchBtn = el('button', {
      type: 'button',
      className: 'branch-context-trigger',
      title: 'Click to switch between Tunasan and Biñan branches',
      'aria-label': 'Active branch: ' + session.selectedBranch.name + ', mode: ' + modeLabel + '. Click to switch branch.',
      onclick: function () {
        requestBranchSwitch(otherBranchId);
      }
    }, [
      Art.createIconSvg('branch-pin', 14),
      el('span', { text: session.selectedBranch.name + ' · ' + modeLabel })
    ]);

    var cartBtn = el('button', {
      id: 'header-cart-btn',
      type: 'button',
      className: 'cart-trigger-btn',
      'aria-label': 'Open cart with ' + session.totals.totalQuantity + ' items, total ' + Data.formatPHP(session.totals.totalCentavos),
      onclick: function () {
        navigateTo('cart');
      }
    }, [
      Art.createIconSvg('bag', 16),
      el('span', { text: 'Cart' }),
      el('span', { className: 'tabular', text: '· ' + session.totals.totalQuantity }),
      session.totals.totalQuantity > 0
        ? el('span', { className: 'tabular', text: '· ' + Data.formatPHP(session.totals.totalCentavos) })
        : null
    ]);

    var inner = el('div', { className: 'header-inner' }, [
      brandLink,
      nav,
      el('div', { className: 'header-actions' }, [
        branchSwitchBtn,
        cartBtn
      ])
    ]);

    headerRoot.appendChild(inner);
  }

  function renderFooter(session) {
    var footerRoot = document.getElementById('site-footer-root');
    if (!footerRoot) return;
    clearNode(footerRoot);

    var config = Data.getConfig();
    footerRoot.appendChild(
      el('div', { className: 'footer-inner' }, [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
          el('span', { className: 'label-text', style: { fontWeight: '700' }, text: config.brandName + ' — ' + config.tagline }),
          el('span', { className: 'helper-text', text: 'Branches: Tunasan (Muntinlupa) & Biñan (Laguna) · All prices are 12% VAT-inclusive.' })
        ]),
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' } }, [
          el('span', { className: 'helper-text', text: 'Front-end academic simulation (localStorage state)' }),
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            style: { fontSize: '0.75rem' },
            text: 'Reset Demo Stock & Orders',
            onclick: function () {
              Data.resetDemoData().then(function () {
                appState.undoRemovedLine = null;
                announceToScreenReader('Demo inventory and sample orders have been reset.');
                renderApp(false);
              });
            }
          })
        ])
      ])
    );
  }

  /* --------------------------------------------------------------------------
     Quick-Add / Morphing Stepper Component for Menu & Featured Items
     -------------------------------------------------------------------------- */
  function createMorphingDishControl(dish, defaultOpt, session) {
    var lineId = dish.id + '__' + defaultOpt.id;
    var existingLine = session.cartLines.find(function (l) { return l.lineId === lineId; });

    var shell = el('div', { className: 'quick-control-shell' });

    if (!dish.available || !defaultOpt.available) {
      shell.appendChild(
        el('button', {
          type: 'button',
          className: 'quick-add-btn',
          disabled: true,
          text: 'Unavailable'
        })
      );
      return shell;
    }

    if (existingLine && existingLine.quantity > 0) {
      var atMax = existingLine.quantity >= Math.min(Data.getConfig().maxQuantityPerLine, defaultOpt.maxOrderableQty);
      var stepper = el('div', {
        className: 'inline-stepper',
        role: 'group',
        'aria-label': 'Quantity for ' + dish.name
      }, [
        el('button', {
          type: 'button',
          className: 'stepper-icon-btn',
          'aria-label': 'Decrease quantity of ' + dish.name,
          onclick: function () {
            Data.updateCartLineQuantity(lineId, existingLine.quantity - 1).then(function () {
              renderApp(false);
            });
          }
        }, [Art.createIconSvg('minus', 14)]),
        el('span', {
          className: 'stepper-qty-readout tabular',
          text: String(existingLine.quantity)
        }),
        el('button', {
          type: 'button',
          className: 'stepper-icon-btn',
          disabled: atMax,
          'aria-label': 'Increase quantity of ' + dish.name,
          onclick: function (ev) {
            launchFlyingCartToken(ev.currentTarget);
            Data.updateCartLineQuantity(lineId, existingLine.quantity + 1).then(function () {
              renderApp(false);
            });
          }
        }, [Art.createIconSvg('plus', 14)])
      ]);
      shell.appendChild(stepper);
    } else {
      var addBtn = el('button', {
        type: 'button',
        className: 'quick-add-btn',
        'aria-label': 'Add ' + dish.name + ' (' + defaultOpt.label + ') to cart',
        onclick: function (ev) {
          launchFlyingCartToken(ev.currentTarget);
          Data.addToCart(dish.id, defaultOpt.id, 1).then(function () {
            announceToScreenReader('Added ' + dish.name + ' to cart.');
            renderApp(false);
          });
        }
      }, [
        Art.createIconSvg('plus', 15),
        el('span', { text: 'Add' })
      ]);
      shell.appendChild(addBtn);
    }

    return shell;
  }

  /* --------------------------------------------------------------------------
     Editorial Dish Card Builder (Used on Home Featured & Menu Chapters)
     -------------------------------------------------------------------------- */
  function createEditorialDishCard(dish, session) {
    var defaultOpt = dish.options.find(function (o) { return o.id === dish.defaultOptionId; }) || dish.options[0];
    var isOut = !dish.available;

    var recipeNames = defaultOpt.recipeDetails.map(function (r) { return r.name; }).join(' · ');
    var stockCaption = isOut
      ? ('Unavailable at ' + session.selectedBranch.name + ' — ' + (defaultOpt.missingIngredients.join(', ') || 'Ingredient') + ' depleted')
      : (defaultOpt.label + ' · Max ' + defaultOpt.maxOrderableQty + ' orderable from branch stock');

    return el('article', {
      className: 'dish-editorial-item' + (isOut ? ' is-unavailable' : '')
    }, [
      el('button', {
        type: 'button',
        className: 'dish-media-button',
        style: appState.routeParam === dish.id ? { viewTransitionName: 'dish-stage-media' } : null,
        'aria-label': 'Inspect details and options for ' + dish.name,
        onclick: function (ev) {
          ev.currentTarget.style.viewTransitionName = 'dish-stage-media';
          navigateTo('item', dish.id);
        }
      }, [
        Art.createDishIllustrationSvg(dish, 0)
      ]),
      el('div', { className: 'dish-body' }, [
        el('div', { className: 'dish-header-line' }, [
          el('button', {
            type: 'button',
            className: 'dish-title-btn',
            text: dish.name,
            onclick: function () {
              navigateTo('item', dish.id);
            }
          }),
          el('span', {
            className: 'dish-price tabular',
            text: Data.formatPHP(defaultOpt.priceCentavos)
          })
        ]),
        el('p', { className: 'dish-desc', text: dish.shortDesc }),
        el('p', { className: 'dish-meta-line', text: 'Kitchen recipe: ' + recipeNames })
      ]),
      el('div', { className: 'dish-footer-actions' }, [
        el('span', {
          className: 'helper-text',
          style: isOut ? { fontWeight: '700', color: 'var(--ink-primary)' } : null,
          text: stockCaption
        }),
        createMorphingDishControl(dish, defaultOpt, session)
      ])
    ]);
  }

  /* --------------------------------------------------------------------------
     SCREEN 1: HOME
     -------------------------------------------------------------------------- */
  function renderHomeScreen(mainRoot, session) {
    var config = Data.getConfig();

    Promise.all([
      Data.getBranches(),
      Data.getMenu(session.selectedBranchId),
      Data.getCuratedPairings(session.selectedBranchId)
    ]).then(function (results) {
      var branches = results[0];
      var menuItems = results[1];
      var pairings = results[2];

      clearNode(mainRoot);
      var wrapper = el('div', { className: 'screen-enter' });

      // 1. Hero Composition with First-Class Branch & Fulfillment Selection
      var branchOptions = branches.map(function (b) {
        return {
          id: b.id,
          label: b.name + ' Branch',
          rightText: b.prefix,
          sublabel: b.address
        };
      });

      var modeOptions = [
        {
          id: 'delivery',
          label: 'Delivery',
          rightText: Data.formatPHP(config.deliveryFeeCentavos),
          sublabel: 'Est. ' + session.selectedBranch.baseDeliveryMins.join('–') + ' min to door'
        },
        {
          id: 'pickup',
          label: 'Pick-up at Counter',
          rightText: 'Free',
          sublabel: 'Ready in ' + session.selectedBranch.basePickupMins.join('–') + ' min'
        }
      ];

      var heroSection = el('section', {
        className: 'hero-composition',
        'aria-labelledby': 'hero-display-title'
      }, [
        el('div', { className: 'hero-copy-col' }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.875rem' } }, [
            el('p', { className: 'hero-kicker', text: config.tagline }),
            el('h1', {
              id: 'hero-display-title',
              className: 'display-headline',
              text: config.heroHeadline
            }),
            el('p', {
              className: 'hero-lead',
              text: config.heroLead
            })
          ]),

          // Interactive Branch & Mode Ledger right in the Hero
          el('div', {
            className: 'hero-fulfillment-ledger',
            role: 'region',
            'aria-label': 'Branch and fulfillment configuration'
          }, [
            el('div', { className: 'ledger-group' }, [
              el('div', { className: 'ledger-group-header' }, [
                el('span', { className: 'ledger-step-label', text: '01. Choose Serving Branch' }),
                el('span', { className: 'ledger-branch-meta tabular', text: 'Order prefix #' + session.selectedBranch.prefix + ' · ' + session.selectedBranch.hours })
              ]),
              createSegmentedControl(branchOptions, session.selectedBranchId, function (nextBranchId) {
                requestBranchSwitch(nextBranchId);
              }, 'Choose serving branch')
            ]),

            el('div', { className: 'ledger-group' }, [
              el('div', { className: 'ledger-group-header' }, [
                el('span', { className: 'ledger-step-label', text: '02. Choose Fulfillment Mode' }),
                el('span', {
                  className: 'ledger-branch-meta',
                  text: session.fulfillmentMode === 'pickup'
                    ? 'No delivery fee · Collect at ' + session.selectedBranch.name + ' counter'
                    : 'Flat ' + Data.formatPHP(config.deliveryFeeCentavos) + ' delivery fee'
                })
              ]),
              createSegmentedControl(modeOptions, session.fulfillmentMode, function (nextMode) {
                Data.setFulfillmentMode(nextMode).then(function () {
                  renderApp(false);
                });
              }, 'Choose fulfillment mode')
            ]),

            el('div', { className: 'hero-cta-row' }, [
              el('button', {
                type: 'button',
                className: 'btn-primary',
                onclick: function () {
                  navigateTo('menu');
                }
              }, [
                el('span', { text: 'Explore ' + session.selectedBranch.name + ' Menu' }),
                Art.createIconSvg('arrow-right', 16)
              ]),
              el('button', {
                type: 'button',
                className: 'btn-secondary',
                onclick: function () {
                  navigateTo('tracking');
                }
              }, [
                el('span', { text: 'Track Existing Order (e.g. TUN-2048)' })
              ])
            ])
          ])
        ]),

        el('div', { className: 'hero-visual-col' }, [
          el('div', { className: 'hero-illustration-stage' }, [
            Art.createHeroCompositionSvg(
              session.selectedBranch.name,
              session.fulfillmentMode === 'pickup' ? 'Pick-up' : 'Delivery'
            )
          ]),
          el('div', { className: 'hero-visual-caption' }, [
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.125rem' } }, [
              el('span', { className: 'label-text', style: { fontWeight: '600' }, text: session.selectedBranch.fullName + ' Kitchen' }),
              el('span', { className: 'helper-text', text: session.selectedBranch.address })
            ]),
            el('span', {
              className: 'helper-text tabular',
              text: 'Tel ' + session.selectedBranch.phone
            })
          ])
        ])
      ]);

      wrapper.appendChild(heroSection);

      // 2. Curated Value Pairings (Typographic Ledger List — Not 3 Outlined Cards)
      var dealsSection = el('section', {
        className: 'home-section',
        'aria-labelledby': 'home-pairings-heading'
      }, [
        el('div', { className: 'section-header-row' }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
            el('h2', { id: 'home-pairings-heading', className: 'section-heading', text: 'Curated Kitchen Pairings' }),
            el('p', { className: 'helper-text', text: 'Bundled combinations for ' + session.selectedBranch.name + ' Branch · Prices include 12% VAT' })
          ]),
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            onclick: function () { navigateTo('menu'); }
          }, [el('span', { text: 'View Full Menu' }), Art.createIconSvg('arrow-right', 14)])
        ]),
        el('div', { className: 'deals-ledger-list' },
          pairings.map(function (deal) {
            return el('div', { className: 'deal-ledger-row' }, [
              el('span', { className: 'deal-index tabular', text: deal.number }),
              el('div', { className: 'deal-title-group' }, [
                el('h3', { className: 'card-title', text: deal.title }),
                el('span', { className: 'helper-text', text: deal.noteText })
              ]),
              el('p', { className: 'deal-components', text: deal.componentsText }),
              el('div', { className: 'deal-price-col' }, [
                el('span', { className: 'deal-price-main tabular', text: Data.formatPHP(deal.priceCentavos) }),
                el('span', { className: 'helper-text', text: 'VAT-inclusive' })
              ]),
              el('button', {
                type: 'button',
                className: 'btn-surface',
                disabled: !deal.available,
                onclick: function (ev) {
                  launchFlyingCartToken(ev.currentTarget);
                  var chain = Promise.resolve();
                  deal.items.forEach(function (entry) {
                    chain = chain.then(function () {
                      return Data.addToCart(entry.itemId, entry.optionId, entry.quantity);
                    });
                  });
                  chain.then(function () {
                    announceToScreenReader('Added ' + deal.title + ' pairing to cart.');
                    renderApp(false);
                  });
                }
              }, [
                Art.createIconSvg('plus', 14),
                el('span', { text: deal.available ? 'Add Pairing' : 'Stock Low' })
              ])
            ]);
          })
        )
      ]);

      wrapper.appendChild(dealsSection);

      // 3. Featured Selection from Current Branch
      var featuredDishes = menuItems.filter(function (m) { return m.featured; }).slice(0, 4);
      var featuredSection = el('section', {
        className: 'home-section',
        'aria-labelledby': 'home-featured-heading'
      }, [
        el('div', { className: 'section-header-row' }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
            el('h2', { id: 'home-featured-heading', className: 'section-heading', text: 'Featured from ' + session.selectedBranch.name + ' Kitchen' }),
            el('p', { className: 'helper-text', text: 'Prepared to order and backed by real-time branch ingredient tracking' })
          ]),
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            onclick: function () { navigateTo('menu'); }
          }, [el('span', { text: 'Browse All 6 Categories' }), Art.createIconSvg('arrow-right', 14)])
        ]),
        el('div', { className: 'featured-editorial-list' },
          featuredDishes.map(function (dish) {
            return createEditorialDishCard(dish, session);
          })
        )
      ]);

      wrapper.appendChild(featuredSection);
      mainRoot.appendChild(wrapper);
    });
  }

  /* --------------------------------------------------------------------------
     SCREEN 2: MENU (Editorial Menu + Sticky Sliding Category Rail + Search)
     -------------------------------------------------------------------------- */
  function renderMenuScreen(mainRoot, session) {
    var categories = Data.getCategories();

    Promise.all([
      Data.getBranches(),
      Data.getMenu(session.selectedBranchId)
    ]).then(function (results) {
      var branches = results[0];
      var menuItems = results[1];

      clearNode(mainRoot);
      var wrapper = el('div', { className: 'screen-enter' });

      // Top Header & Live Search Bar
      var searchInput = el('input', {
        type: 'search',
        id: 'menu-live-search',
        className: 'menu-search-input',
        placeholder: 'Search dishes or ingredients (e.g. chicken, brioche, fries)...',
        value: appState.menuSearchQuery,
        'aria-label': 'Search menu items',
        oninput: function (e) {
          appState.menuSearchQuery = e.target.value;
          updateMenuResultsRegion(menuItems, categories, session);
        }
      });

      var topBar = el('div', { className: 'menu-top-bar' }, [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem' } }, [
          el('p', {
            className: 'helper-text',
            text: session.selectedBranch.fullName + ' · ' + (session.fulfillmentMode === 'pickup' ? 'Counter Pick-up (Free)' : 'Delivery (' + Data.formatPHP(Data.getConfig().deliveryFeeCentavos) + ')')
          }),
          el('h1', { className: 'page-title', text: 'Kitchen Menu' })
        ]),

        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' } }, [
          // Quick Branch Switcher pills
          el('div', { style: { display: 'inline-flex', gap: '0.375rem' } },
            branches.map(function (b) {
              var isCurr = b.id === session.selectedBranchId;
              return el('button', {
                type: 'button',
                className: isCurr ? 'btn-primary' : 'btn-surface',
                style: { padding: '0.5rem 0.875rem', fontSize: '0.8125rem' },
                text: b.name,
                'aria-pressed': isCurr ? 'true' : 'false',
                onclick: function () {
                  if (!isCurr) requestBranchSwitch(b.id);
                }
              });
            })
          ),

          el('div', { className: 'menu-search-wrap' }, [
            el('span', { className: 'search-icon-prefix' }, [Art.createIconSvg('search', 16)]),
            searchInput,
            appState.menuSearchQuery
              ? el('button', {
                  type: 'button',
                  className: 'search-clear-btn',
                  'aria-label': 'Clear search query',
                  onclick: function () {
                    appState.menuSearchQuery = '';
                    renderMenuScreen(mainRoot, session);
                  }
                }, [Art.createIconSvg('close', 14)])
              : null
          ])
        ])
      ]);

      wrapper.appendChild(topBar);

      // Workspace: Left Sticky Category Index + Right Editorial Chapters
      var activeCatIdx = Math.max(0, categories.indexOf(appState.activeCategory));
      var railIndicator = el('div', {
        id: 'category-rail-indicator',
        className: 'category-rail-indicator',
        'aria-hidden': 'true',
        style: {
          transform: 'translateY(' + (activeCatIdx * 40) + 'px)'
        }
      });

      var categoryRail = el('nav', {
        className: 'category-rail',
        'aria-label': 'Menu categories'
      }, [
        el('div', { className: 'category-rail-track', 'aria-hidden': 'true' }),
        railIndicator
      ].concat(
        categories.map(function (cat, idx) {
          var count = menuItems.filter(function (m) { return m.category === cat; }).length;
          var isAct = appState.activeCategory === cat;
          return el('button', {
            type: 'button',
            className: 'category-nav-btn' + (isAct ? ' is-active' : ''),
            'data-cat': cat,
            onclick: function () {
              appState.activeCategory = cat;
              var ind = document.getElementById('category-rail-indicator');
              if (ind) {
                ind.style.transform = 'translateY(' + (idx * 40) + 'px)';
              }
              var btns = categoryRail.querySelectorAll('.category-nav-btn');
              btns.forEach(function (b) {
                if (b.getAttribute('data-cat') === cat) {
                  b.classList.add('is-active');
                } else {
                  b.classList.remove('is-active');
                }
              });
              var chapterEl = document.getElementById('chapter-' + cat.toLowerCase().replace(/\s+/g, '-'));
              if (chapterEl) {
                chapterEl.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
              }
            }
          }, [
            el('span', { text: cat }),
            el('span', { className: 'category-count tabular', text: String(count) })
          ]);
        })
      ));

      var chaptersContainer = el('div', {
        id: 'menu-chapters-root',
        className: 'menu-chapters'
      });

      var workspace = el('div', { className: 'menu-workspace' }, [
        categoryRail,
        chaptersContainer
      ]);

      wrapper.appendChild(workspace);
      mainRoot.appendChild(wrapper);

      updateMenuResultsRegion(menuItems, categories, session);
    });
  }

  function updateMenuResultsRegion(menuItems, categories, session) {
    var chaptersRoot = document.getElementById('menu-chapters-root');
    if (!chaptersRoot) return;
    clearNode(chaptersRoot);

    var q = String(appState.menuSearchQuery || '').trim().toLowerCase();
    var filtered = menuItems.filter(function (dish) {
      if (!q) return true;
      var inName = dish.name.toLowerCase().indexOf(q) !== -1;
      var inDesc = dish.shortDesc.toLowerCase().indexOf(q) !== -1;
      var inCat = dish.category.toLowerCase().indexOf(q) !== -1;
      return inName || inDesc || inCat;
    });

    if (filtered.length === 0) {
      chaptersRoot.appendChild(
        el('div', {
          style: {
            backgroundColor: 'var(--surface-subtle)',
            padding: '3rem 2rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }
        }, [
          el('h2', { className: 'section-heading', text: 'No dishes match "' + appState.menuSearchQuery + '"' }),
          el('p', { className: 'body-text', text: 'Try searching by category (Burgers, Chickens, Fries, Drinks, Desserts, Kids Meals) or clear the filter.' }),
          el('button', {
            type: 'button',
            className: 'btn-primary',
            text: 'Reset Search Filter',
            onclick: function () {
              appState.menuSearchQuery = '';
              var input = document.getElementById('menu-live-search');
              if (input) input.value = '';
              updateMenuResultsRegion(menuItems, categories, session);
            }
          })
        ])
      );
      return;
    }

    categories.forEach(function (cat, idx) {
      var catDishes = filtered.filter(function (d) { return d.category === cat; });
      if (catDishes.length === 0) return;

      var numPrefix = '0' + (idx + 1);
      var chapter = el('section', {
        id: 'chapter-' + cat.toLowerCase().replace(/\s+/g, '-'),
        className: 'menu-chapter',
        'aria-labelledby': 'heading-' + idx
      }, [
        el('div', { className: 'chapter-header' }, [
          el('h2', {
            id: 'heading-' + idx,
            className: 'section-heading',
            text: numPrefix + '. ' + cat
          }),
          el('span', {
            className: 'helper-text tabular',
            text: catDishes.length + (catDishes.length === 1 ? ' dish' : ' dishes')
          })
        ]),
        el('div', { className: 'chapter-dishes' },
          catDishes.map(function (dish) {
            return createEditorialDishCard(dish, session);
          })
        )
      ]);

      chaptersRoot.appendChild(chapter);
    });
  }

  /* --------------------------------------------------------------------------
     SCREEN 3: FOOD DETAILS (Cross-Fade Gallery + Segmented Options + Rolling Price)
     -------------------------------------------------------------------------- */
  function renderFoodDetailsScreen(mainRoot, session) {
    Data.getMenuItem(appState.routeParam, session.selectedBranchId).then(function (dish) {
      clearNode(mainRoot);

      if (!dish) {
        mainRoot.appendChild(
          el('div', { className: 'screen-enter', style: { padding: '3rem 0', textAlign: 'center' } }, [
            el('h1', { className: 'page-title', text: 'Dish not found' }),
            el('p', { className: 'body-text', style: { marginTop: '0.5rem' }, text: 'The requested menu item could not be located.' }),
            el('button', {
              type: 'button',
              className: 'btn-primary',
              style: { marginTop: '1.5rem' },
              text: 'Return to Menu',
              onclick: function () { navigateTo('menu'); }
            })
          ])
        );
        return;
      }

      var selectedOpt = dish.options.find(function (o) { return o.id === appState.detailSelectedOptionId; })
        || dish.options.find(function (o) { return o.available; })
        || dish.options[0];
      appState.detailSelectedOptionId = selectedOpt.id;

      var maxAllowedQty = Math.min(
        Data.getConfig().maxQuantityPerLine,
        Math.max(1, selectedOpt.maxOrderableQty)
      );
      if (appState.detailQuantity > maxAllowedQty) {
        appState.detailQuantity = maxAllowedQty;
      }

      var totalPriceCentavos = selectedOpt.priceCentavos * appState.detailQuantity;

      var wrapper = el('div', { className: 'screen-enter' }, [
        el('div', { className: 'detail-back-bar' }, [
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            onclick: function () {
              appState.activeCategory = dish.category;
              navigateTo('menu');
            }
          }, [
            Art.createIconSvg('arrow-left', 16),
            el('span', { text: 'Back to Menu · ' + dish.category })
          ])
        ])
      ]);

      // Left Column: 4-Frame Cross-Fading Gallery
      var stageFrames = [0, 1, 2, 3].map(function (frameIdx) {
        return el('div', {
          className: 'detail-stage-frame' + (appState.detailGalleryIndex === frameIdx ? ' is-active' : ''),
          'data-frame': String(frameIdx)
        }, [
          Art.createDishIllustrationSvg(dish, frameIdx)
        ]);
      });

      var mainStage = el('div', {
        className: 'detail-main-stage',
        style: { viewTransitionName: 'dish-stage-media' }
      }, stageFrames);

      var thumbButtons = [0, 1, 2, 3].map(function (frameIdx) {
        var caption = dish.galleryCaptions[frameIdx] || ('Study ' + (frameIdx + 1));
        var isAct = appState.detailGalleryIndex === frameIdx;
        return el('button', {
          type: 'button',
          className: 'detail-thumb-btn' + (isAct ? ' is-active' : ''),
          'aria-label': 'View ' + caption,
          'aria-pressed': isAct ? 'true' : 'false',
          onclick: function () {
            appState.detailGalleryIndex = frameIdx;
            var allFrames = mainStage.querySelectorAll('.detail-stage-frame');
            allFrames.forEach(function (f, i) {
              if (i === frameIdx) f.classList.add('is-active');
              else f.classList.remove('is-active');
            });
            var allThumbs = thumbStrip.querySelectorAll('.detail-thumb-btn');
            allThumbs.forEach(function (t, i) {
              if (i === frameIdx) {
                t.classList.add('is-active');
                t.setAttribute('aria-pressed', 'true');
              } else {
                t.classList.remove('is-active');
                t.setAttribute('aria-pressed', 'false');
              }
            });
          }
        }, [
          el('div', { className: 'detail-thumb-preview' }, [
            Art.createDishIllustrationSvg(dish, frameIdx)
          ]),
          el('span', { className: 'detail-thumb-caption', text: caption })
        ]);
      });

      var thumbStrip = el('div', {
        className: 'detail-thumb-strip',
        role: 'group',
        'aria-label': 'Illustration views'
      }, thumbButtons);

      var galleryCol = el('div', { className: 'detail-gallery-col' }, [
        mainStage,
        thumbStrip
      ]);

      // Right Column: Purchase Module, Segmented Options, Rolling Price, Recipe Transparency
      var segmentedItems = dish.options.map(function (opt) {
        return {
          id: opt.id,
          label: opt.label,
          rightText: Data.formatPHP(opt.priceCentavos),
          sublabel: opt.available ? opt.sublabel : 'Out of stock at ' + session.selectedBranch.name,
          disabled: !opt.available
        };
      });

      var purchaseCol = el('div', { className: 'detail-purchase-col' }, [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } }, [
          el('span', {
            className: 'helper-text',
            text: dish.category + ' · Prepared at ' + session.selectedBranch.fullName
          }),
          el('h1', { className: 'page-title', text: dish.name }),
          el('p', { className: 'body-text', text: dish.longDesc })
        ]),

        // Live Rolling Price Readout
        el('div', {
          style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: '0.25rem' }
        }, [
          el('div', { className: 'rolling-price-wrap' }, [
            el('span', {
              id: 'detail-rolling-price',
              className: 'rolling-price-value roll-up tabular',
              text: Data.formatPHP(totalPriceCentavos)
            })
          ]),
          el('span', {
            className: 'helper-text tabular',
            text: appState.detailQuantity > 1
              ? (appState.detailQuantity + ' × ' + Data.formatPHP(selectedOpt.priceCentavos) + ' (VAT-inclusive)')
              : '12% VAT-inclusive'
          })
        ]),

        // Category-specific Segmented Selector (e.g. Single vs Double Patty; Regular/Medium/Large)
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } }, [
          el('span', { className: 'label-text', style: { fontWeight: '600' }, text: dish.optionsLabel + ':' }),
          createSegmentedControl(segmentedItems, selectedOpt.id, function (nextOptionId) {
            appState.detailSelectedOptionId = nextOptionId;
            renderFoodDetailsScreen(mainRoot, session);
          }, dish.optionsLabel)
        ]),

        // Quantity Stepper + Add to Cart CTA
        el('div', { className: 'detail-action-row' }, [
          el('div', {
            className: 'detail-qty-stepper',
            role: 'group',
            'aria-label': 'Choose quantity'
          }, [
            el('button', {
              type: 'button',
              className: 'detail-qty-btn',
              disabled: !selectedOpt.available || appState.detailQuantity <= 1,
              'aria-label': 'Decrease quantity',
              onclick: function () {
                if (appState.detailQuantity > 1) {
                  appState.detailQuantity -= 1;
                  renderFoodDetailsScreen(mainRoot, session);
                }
              }
            }, [Art.createIconSvg('minus', 16)]),
            el('span', {
              className: 'tabular',
              style: { minWidth: '36px', textAlign: 'center', fontWeight: '700', fontSize: '1.0625rem' },
              text: String(appState.detailQuantity)
            }),
            el('button', {
              type: 'button',
              className: 'detail-qty-btn',
              disabled: !selectedOpt.available || appState.detailQuantity >= maxAllowedQty,
              'aria-label': 'Increase quantity',
              onclick: function () {
                if (appState.detailQuantity < maxAllowedQty) {
                  appState.detailQuantity += 1;
                  renderFoodDetailsScreen(mainRoot, session);
                }
              }
            }, [Art.createIconSvg('plus', 16)])
          ]),

          el('button', {
            type: 'button',
            className: 'btn-primary',
            disabled: !selectedOpt.available,
            onclick: function (ev) {
              var btn = ev.currentTarget;
              launchFlyingCartToken(btn);
              Data.addToCart(dish.id, selectedOpt.id, appState.detailQuantity).then(function (updatedSession) {
                announceToScreenReader('Added ' + appState.detailQuantity + ' ' + dish.name + ' (' + selectedOpt.label + ') to cart.');
                renderHeader(updatedSession);
                clearNode(btn);
                btn.appendChild(Art.createIconSvg('check', 18));
                btn.appendChild(el('span', { text: 'Added to Cart · ' + Data.formatPHP(totalPriceCentavos) }));
                setTimeout(function () {
                  if (appState.route === 'item') {
                    renderFoodDetailsScreen(mainRoot, Data.getSessionState());
                  }
                }, 900);
              });
            }
          }, [
            Art.createIconSvg('bag', 18),
            el('span', {
              text: selectedOpt.available
                ? ('Add to Cart · ' + Data.formatPHP(totalPriceCentavos))
                : ('Unavailable at ' + session.selectedBranch.name)
            })
          ])
        ]),

        // Branch Inventory & Recipe Transparency Panel
        el('div', { className: 'detail-recipe-panel' }, [
          el('span', {
            className: 'label-text',
            style: { fontWeight: '600' },
            text: 'Branch Stock & Recipe Deduction per ' + selectedOpt.label
          }),
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } },
            selectedOpt.recipeDetails.map(function (r) {
              var totalDeducted = r.qtyRequired * appState.detailQuantity;
              return el('div', {
                style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }
              }, [
                el('span', { text: r.name }),
                el('span', {
                  className: 'tabular',
                  style: { color: 'var(--ink-secondary)' },
                  text: 'Uses ' + totalDeducted + ' ' + r.unit + ' (' + r.branchRemaining + ' in ' + session.selectedBranch.name + ' stock)'
                })
              ]);
            })
          )
        ])
      ]);

      wrapper.appendChild(
        el('div', { className: 'detail-layout' }, [galleryCol, purchaseCol])
      );
      mainRoot.appendChild(wrapper);
    });
  }

  /* --------------------------------------------------------------------------
     SCREEN 4: CART (Ledger Composition + Sliding Mode + Undo Reflow + Exact Math)
     -------------------------------------------------------------------------- */
  function renderCartScreen(mainRoot, session) {
    clearNode(mainRoot);
    var config = Data.getConfig();
    var totals = session.totals;

    var wrapper = el('div', { className: 'screen-enter' });

    // Top Header
    wrapper.appendChild(
      el('div', {
        style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }
      }, [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
          el('span', { className: 'helper-text', text: session.selectedBranch.fullName + ' · Order Prefix #' + session.selectedBranch.prefix }),
          el('h1', { className: 'page-title', text: 'Your Order Ledger' })
        ]),
        el('button', {
          type: 'button',
          className: 'btn-secondary',
          onclick: function () { navigateTo('menu'); }
        }, [
          Art.createIconSvg('plus', 14),
          el('span', { text: 'Add More Items' })
        ])
      ])
    );

    // Undo Banner if an item was just removed
    if (appState.undoRemovedLine) {
      var removed = appState.undoRemovedLine;
      wrapper.appendChild(
        el('div', { className: 'undo-bar', role: 'status', 'aria-live': 'polite' }, [
          el('span', {
            className: 'label-text',
            text: 'Removed "' + removed.name + ' (' + removed.optionLabel + ')" from your cart.'
          }),
          el('button', {
            type: 'button',
            className: 'undo-action-btn',
            text: 'Undo Removal',
            onclick: function () {
              if (appState.undoTimerId) clearTimeout(appState.undoTimerId);
              var toRestore = appState.undoRemovedLine;
              var targetIdx = appState.undoRemovedIndex;
              appState.undoRemovedLine = null;
              Data.restoreCartLine(toRestore, targetIdx).then(function () {
                announceToScreenReader('Restored ' + toRestore.name + ' to cart.');
                renderApp(false);
              });
            }
          })
        ])
      );
    }

    // Empty State
    if (totals.lines.length === 0) {
      wrapper.appendChild(
        el('div', {
          style: {
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }
        }, [
          el('h2', { className: 'section-heading', text: 'Your cart ledger is currently empty' }),
          el('p', {
            className: 'body-text',
            style: { maxWidth: '46ch' },
            text: 'Browse our six freshly prepared categories from ' + session.selectedBranch.name + ' Branch to start building your order.'
          }),
          el('button', {
            type: 'button',
            className: 'btn-primary',
            style: { marginTop: '0.5rem' },
            onclick: function () { navigateTo('menu'); }
          }, [
            el('span', { text: 'Explore ' + session.selectedBranch.name + ' Menu' }),
            Art.createIconSvg('arrow-right', 16)
          ])
        ])
      );
      mainRoot.appendChild(wrapper);
      return;
    }

    // Fulfillment Mode Sliding Control
    var modeOptions = [
      {
        id: 'delivery',
        label: 'Delivery',
        rightText: Data.formatPHP(config.deliveryFeeCentavos),
        sublabel: 'Est. ' + session.selectedBranch.baseDeliveryMins.join('–') + ' min'
      },
      {
        id: 'pickup',
        label: 'Pick-up',
        rightText: 'Free',
        sublabel: 'Ready in ' + session.selectedBranch.basePickupMins.join('–') + ' min'
      }
    ];

    var ledgerRows = totals.lines.map(function (line) {
      var rowNode = el('div', { className: 'ledger-row', 'data-line-id': line.lineId }, [
        el('div', { className: 'ledger-thumb' }, [
          Art.createDishIllustrationSvg({ id: line.itemId, name: line.name, category: line.category }, 0)
        ]),
        el('div', { className: 'ledger-item-info' }, [
          el('button', {
            type: 'button',
            className: 'dish-title-btn ledger-item-title',
            text: line.name,
            onclick: function () { navigateTo('item', line.itemId); }
          }),
          el('span', {
            className: 'ledger-item-meta tabular',
            text: line.optionLabel + ' · ' + Data.formatPHP(line.unitPriceCentavos) + ' each'
          })
        ]),
        el('div', { className: 'quick-control-shell' }, [
          el('div', {
            className: 'inline-stepper',
            role: 'group',
            'aria-label': 'Quantity for ' + line.name + ' (' + line.optionLabel + ')'
          }, [
            el('button', {
              type: 'button',
              className: 'stepper-icon-btn',
              'aria-label': line.quantity === 1
                ? ('Remove ' + line.name + ' (' + line.optionLabel + ')')
                : ('Decrease quantity of ' + line.name),
              onclick: function () {
                if (line.quantity === 1) {
                  rowNode.classList.add('is-removing');
                }
                setTimeout(function () {
                  Data.updateCartLineQuantity(line.lineId, line.quantity - 1).then(function (res) {
                    if (res.removedLine) {
                      appState.undoRemovedLine = res.removedLine;
                      appState.undoRemovedIndex = res.removedIndex;
                      if (appState.undoTimerId) clearTimeout(appState.undoTimerId);
                      appState.undoTimerId = setTimeout(function () {
                        appState.undoRemovedLine = null;
                        if (appState.route === 'cart') renderApp(false);
                      }, 6500);
                    }
                    renderApp(false);
                  });
                }, line.quantity === 1 && !prefersReducedMotion() ? 180 : 0);
              }
            }, [Art.createIconSvg('minus', 14)]),
            el('span', { className: 'stepper-qty-readout tabular', text: String(line.quantity) }),
            el('button', {
              type: 'button',
              className: 'stepper-icon-btn',
              disabled: line.quantity >= config.maxQuantityPerLine,
              'aria-label': 'Increase quantity of ' + line.name,
              onclick: function () {
                Data.updateCartLineQuantity(line.lineId, line.quantity + 1).then(function () {
                  renderApp(false);
                });
              }
            }, [Art.createIconSvg('plus', 14)])
          ])
        ]),
        el('div', {
          className: 'ledger-line-price tabular',
          text: Data.formatPHP(line.lineTotalCentavos)
        })
      ]);
      return rowNode;
    });

    var leftCol = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem' } }, [
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } }, [
        el('span', { className: 'label-text', style: { fontWeight: '600' }, text: 'Fulfillment Method' }),
        createSegmentedControl(modeOptions, session.fulfillmentMode, function (nextMode) {
          Data.setFulfillmentMode(nextMode).then(function () {
            renderApp(false);
          });
        }, 'Fulfillment method')
      ]),
      el('div', { className: 'ledger-table', role: 'list', 'aria-label': 'Cart items' }, ledgerRows)
    ]);

    var rightCol = el('aside', {
      className: 'summary-ledger-card',
      'aria-label': 'Order price breakdown'
    }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, [
        el('h2', { className: 'section-heading', text: 'Order Summary' }),
        el('span', { className: 'helper-text tabular', text: totals.totalQuantity + (totals.totalQuantity === 1 ? ' item' : ' items') })
      ]),

      el('div', { className: 'math-breakdown' }, [
        el('div', { className: 'math-line' }, [
          el('span', { text: 'Items Subtotal (VAT-incl.)' }),
          el('span', { className: 'tabular', style: { fontWeight: '600' }, text: Data.formatPHP(totals.subtotalCentavos) })
        ]),
        el('div', { className: 'math-line' }, [
          el('span', { text: session.fulfillmentMode === 'pickup' ? 'Counter Pick-up Fee' : 'Flat Delivery Fee' }),
          el('span', {
            className: 'tabular',
            style: { fontWeight: '600' },
            text: session.fulfillmentMode === 'pickup' ? 'Free (₱0.00)' : Data.formatPHP(totals.deliveryFeeCentavos)
          })
        ]),
        el('div', { className: 'math-line-total' }, [
          el('span', { className: 'card-title', text: 'Total' }),
          el('span', { className: 'total-amount tabular', text: Data.formatPHP(totals.totalCentavos) })
        ]),
        el('div', { className: 'math-line-vat' }, [
          el('span', { text: 'Includes 12% VAT (Total × 12 ÷ 112)' }),
          el('span', { className: 'tabular', text: Data.formatPHP(totals.includedVatCentavos) })
        ])
      ]),

      el('button', {
        type: 'button',
        className: 'btn-primary',
        style: { width: '100%' },
        onclick: function () {
          navigateTo('checkout');
        }
      }, [
        el('span', { text: 'Proceed to Checkout' }),
        Art.createIconSvg('arrow-right', 16)
      ])
    ]);

    wrapper.appendChild(el('div', { className: 'cart-layout' }, [leftCol, rightCol]));
    mainRoot.appendChild(wrapper);
  }

  /* --------------------------------------------------------------------------
     SCREEN 5: CHECKOUT (One Coherent Screen + Mode Reflow + Forgiving Validation)
     -------------------------------------------------------------------------- */
  function validateCheckoutFields(draft, mode) {
    var errors = {};
    var name = String(draft.fullName || '').trim();
    var phone = String(draft.phone || '').trim();
    var compactPhone = phone.replace(/[\s\-()]/g, '');

    if (name.length < 2) {
      errors.fullName = 'Please enter your name (at least 2 characters) so our branch staff can identify your order.';
    }

    // Valid Philippine mobile format: 09XX XXX XXXX (11 digits) or +639XX XXX XXXX (13 chars)
    var validPhMobile = /^(09\d{9}|\+639\d{9})$/.test(compactPhone);
    if (!validPhMobile) {
      errors.phone = 'Enter a valid Philippine mobile number (for example 0917 842 3310 or +63 917 842 3310).';
    }

    if (mode === 'delivery') {
      var addr = String(draft.address || '').trim();
      if (addr.length < 8) {
        errors.address = 'Please enter a complete street, village/subdivision, or building address for delivery.';
      }
    } else {
      var pTime = String(draft.pickupTime || '').trim();
      if (!pTime) {
        errors.pickupTime = 'Please choose a preferred counter pick-up time.';
      }
    }

    return errors;
  }

  function renderCheckoutScreen(mainRoot, session) {
    clearNode(mainRoot);

    if (session.totals.lines.length === 0) {
      navigateTo('cart');
      return;
    }

    var config = Data.getConfig();
    var totals = session.totals;
    var draft = Object.assign({
      fullName: '',
      phone: '',
      address: '',
      landmark: '',
      pickupTime: 'As soon as ready (15–20 min)',
      paymentMethod: 'cash'
    }, session.checkoutDraft || {});

    var wrapper = el('div', { className: 'screen-enter' }, [
      el('div', { className: 'detail-back-bar' }, [
        el('button', {
          type: 'button',
          className: 'btn-secondary',
          onclick: function () { navigateTo('cart'); }
        }, [
          Art.createIconSvg('arrow-left', 16),
          el('span', { text: 'Back to Cart Ledger' })
        ])
      ]),
      el('div', { style: { marginBottom: '1.5rem' } }, [
        el('span', { className: 'helper-text', text: session.selectedBranch.fullName + ' · Guest Checkout' }),
        el('h1', { className: 'page-title', text: 'Checkout & Fulfillment' })
      ])
    ]);

    function createFieldNode(fieldKey, labelText, helperHint, inputElement, isFullSpan) {
      var errText = appState.checkoutErrors[fieldKey];
      var errId = 'err-' + fieldKey;
      if (errText) {
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.setAttribute('aria-describedby', errId);
      } else {
        inputElement.removeAttribute('aria-invalid');
      }

      return el('div', {
        className: 'form-field' + (isFullSpan ? ' span-full' : '') + (errText ? ' has-error shake-error' : '')
      }, [
        el('label', { className: 'field-label', for: inputElement.id }, [
          el('span', { text: labelText }),
          helperHint ? el('span', { className: 'helper-text', text: helperHint }) : null
        ]),
        inputElement,
        errText
          ? el('div', { id: errId, className: 'field-error-msg', role: 'alert' }, [
              Art.createIconSvg('warning-octagon', 15),
              el('span', { text: errText })
            ])
          : null
      ]);
    }

    var nameInput = el('input', {
      id: 'checkout-fullname',
      type: 'text',
      className: 'field-input',
      autocomplete: 'name',
      maxLength: '120',
      placeholder: 'e.g. Andrea Villareal',
      value: draft.fullName,
      oninput: function (e) {
        draft.fullName = e.target.value;
        Data.saveCheckoutDraft({ fullName: draft.fullName });
        if (appState.checkoutErrors.fullName) {
          delete appState.checkoutErrors.fullName;
          renderCheckoutScreen(mainRoot, Data.getSessionState());
        }
      }
    });

    var phoneInput = el('input', {
      id: 'checkout-phone',
      type: 'tel',
      className: 'field-input tabular',
      autocomplete: 'tel',
      placeholder: '0917 842 3310 or +63 917 842 3310',
      value: draft.phone,
      oninput: function (e) {
        draft.phone = e.target.value;
        Data.saveCheckoutDraft({ phone: draft.phone });
        if (appState.checkoutErrors.phone) {
          delete appState.checkoutErrors.phone;
          renderCheckoutScreen(mainRoot, Data.getSessionState());
        }
      }
    });

    var modeFields = [
      createFieldNode('fullName', 'Full Name', 'Required', nameInput, false),
      createFieldNode('phone', 'Philippine Mobile Number', '09XX XXX XXXX', phoneInput, false)
    ];

    // Mode-specific controls are completely removed from DOM when inactive
    if (session.fulfillmentMode === 'delivery') {
      var addrInput = el('textarea', {
        id: 'checkout-address',
        className: 'field-textarea',
        maxLength: '240',
        placeholder: 'House/Unit No., Street, Subdivision/Village, Barangay (' + session.selectedBranch.name + ' area)',
        value: draft.address,
        oninput: function (e) {
          draft.address = e.target.value;
          Data.saveCheckoutDraft({ address: draft.address });
          if (appState.checkoutErrors.address) {
            delete appState.checkoutErrors.address;
            renderCheckoutScreen(mainRoot, Data.getSessionState());
          }
        }
      });
      addrInput.value = draft.address || '';

      var landmarkInput = el('input', {
        id: 'checkout-landmark',
        type: 'text',
        className: 'field-input',
        maxLength: '160',
        placeholder: 'e.g. Gate color, nearby store, or rider instructions',
        value: draft.landmark,
        oninput: function (e) {
          draft.landmark = e.target.value;
          Data.saveCheckoutDraft({ landmark: draft.landmark });
        }
      });

      modeFields.push(createFieldNode('address', 'Delivery Address', 'Required for delivery', addrInput, true));
      modeFields.push(createFieldNode('landmark', 'Landmark or Rider Notes', 'Optional', landmarkInput, true));
    } else {
      var pickupSlots = [
        'As soon as ready (15–20 min)',
        'In 30 minutes',
        'In 45 minutes',
        'In 1 hour'
      ];
      var pickupSelect = el('select', {
        id: 'checkout-pickup-time',
        className: 'field-select tabular',
        onchange: function (e) {
          draft.pickupTime = e.target.value;
          Data.saveCheckoutDraft({ pickupTime: draft.pickupTime });
        }
      }, pickupSlots.map(function (slot) {
        return el('option', {
          value: slot,
          selected: draft.pickupTime === slot,
          text: slot
        });
      }));

      modeFields.push(
        createFieldNode(
          'pickupTime',
          'Preferred Counter Pick-up Time at ' + session.selectedBranch.name,
          session.selectedBranch.address,
          pickupSelect,
          true
        )
      );
    }

    var modeSwitchOptions = [
      {
        id: 'delivery',
        label: 'Delivery',
        rightText: Data.formatPHP(config.deliveryFeeCentavos),
        sublabel: 'Rider dispatch from ' + session.selectedBranch.name
      },
      {
        id: 'pickup',
        label: 'Pick-up at Counter',
        rightText: 'Free',
        sublabel: session.selectedBranch.address
      }
    ];

    var step1Section = el('section', {
      className: 'checkout-step-section',
      'aria-labelledby': 'checkout-step1-title'
    }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' } }, [
        el('h2', { id: 'checkout-step1-title', className: 'section-heading', text: '01. Fulfillment Details' }),
        el('span', { className: 'helper-text', text: 'Serving Branch: ' + session.selectedBranch.fullName })
      ]),
      createSegmentedControl(modeSwitchOptions, session.fulfillmentMode, function (nextMode) {
        appState.checkoutErrors = {};
        Data.setFulfillmentMode(nextMode).then(function () {
          renderApp(false);
        });
      }, 'Fulfillment mode'),
      el('div', { className: 'form-grid' }, modeFields),
      el('p', {
        className: 'helper-text',
        text: 'Note: Client-side validation is provided for immediate usability; in a production deployment, all inputs and stock locks are verified on the server.'
      })
    ]);

    // Step 2: Payment Method (Cash vs Clearly Labeled Simulated E-Wallet)
    var paymentChoices = [
      {
        id: 'cash',
        title: session.fulfillmentMode === 'pickup' ? 'Cash at Counter' : 'Cash on Delivery',
        desc: session.fulfillmentMode === 'pickup'
          ? 'Pay in Philippine Pesos directly at the ' + session.selectedBranch.name + ' cashier counter when collecting your order.'
          : 'Pay our branch rider in cash upon receipt at your doorstep.'
      },
      {
        id: 'ewallet_demo',
        title: 'E-Wallet (Simulated Demo — GCash / Maya)',
        desc: 'Front-end simulation only. Selecting this option marks the order as Demo E-Wallet for academic testing. We never ask for, process, or store any real card, mobile wallet, or account number.'
      }
    ];

    var step2Section = el('section', {
      className: 'checkout-step-section',
      'aria-labelledby': 'checkout-step2-title'
    }, [
      el('h2', { id: 'checkout-step2-title', className: 'section-heading', text: '02. Payment Method' }),
      el('div', { className: 'payment-options-stack', role: 'radiogroup', 'aria-label': 'Payment method' },
        paymentChoices.map(function (pm) {
          var isSelected = draft.paymentMethod === pm.id;
          return el('button', {
            type: 'button',
            role: 'radio',
            'aria-checked': isSelected ? 'true' : 'false',
            className: 'payment-option-card' + (isSelected ? ' is-selected' : ''),
            onclick: function () {
              draft.paymentMethod = pm.id;
              Data.saveCheckoutDraft({ paymentMethod: pm.id }).then(function () {
                renderCheckoutScreen(mainRoot, Data.getSessionState());
              });
            }
          }, [
            el('span', { className: 'geometric-radio', 'aria-hidden': 'true' }),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
              el('span', { className: 'card-title', text: pm.title }),
              el('span', { className: 'body-text', style: { fontSize: '0.875rem' }, text: pm.desc })
            ])
          ]);
        })
      )
    ]);

    var leftCol = el('div', {}, [step1Section, step2Section]);

    // Right Column: Sticky Coherent Order Summary & Place Order Button
    var submitErrorBanner = appState.checkoutErrors.general
      ? el('div', { className: 'field-error-msg', role: 'alert', style: { padding: '0.5rem 0' } }, [
          Art.createIconSvg('warning-octagon', 16),
          el('span', { text: appState.checkoutErrors.general })
        ])
      : null;

    var rightCol = el('aside', {
      className: 'summary-ledger-card',
      'aria-label': 'Checkout order summary'
    }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, [
        el('h2', { className: 'section-heading', text: '03. Order Summary' }),
        el('span', { className: 'helper-text', text: session.selectedBranch.name + ' (' + session.selectedBranch.prefix + ')' })
      ]),

      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.625rem' } },
        totals.lines.map(function (line) {
          return el('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.875rem' }
          }, [
            el('div', { style: { display: 'flex', flexDirection: 'column' } }, [
              el('span', { style: { fontWeight: '600' }, text: line.quantity + '× ' + line.name }),
              el('span', { className: 'helper-text', text: line.optionLabel })
            ]),
            el('span', { className: 'tabular', style: { fontWeight: '600' }, text: Data.formatPHP(line.lineTotalCentavos) })
          ]);
        })
      ),

      el('div', { className: 'math-breakdown' }, [
        el('div', { className: 'math-line' }, [
          el('span', { text: 'Subtotal' }),
          el('span', { className: 'tabular', style: { fontWeight: '600' }, text: Data.formatPHP(totals.subtotalCentavos) })
        ]),
        el('div', { className: 'math-line' }, [
          el('span', { text: session.fulfillmentMode === 'pickup' ? 'Pick-up Fee' : 'Delivery Fee' }),
          el('span', {
            className: 'tabular',
            style: { fontWeight: '600' },
            text: session.fulfillmentMode === 'pickup' ? 'Free (₱0.00)' : Data.formatPHP(totals.deliveryFeeCentavos)
          })
        ]),
        el('div', { className: 'math-line-total' }, [
          el('span', { className: 'card-title', text: 'Total' }),
          el('span', { className: 'total-amount tabular', text: Data.formatPHP(totals.totalCentavos) })
        ]),
        el('div', { className: 'math-line-vat' }, [
          el('span', { text: 'Includes 12% VAT' }),
          el('span', { className: 'tabular', text: Data.formatPHP(totals.includedVatCentavos) })
        ])
      ]),

      submitErrorBanner,

      el('button', {
        id: 'place-order-submit-btn',
        type: 'button',
        className: 'btn-primary',
        disabled: appState.isSubmittingOrder,
        style: { width: '100%' },
        onclick: function () {
          if (appState.isSubmittingOrder) return;
          var validationErrors = validateCheckoutFields(draft, session.fulfillmentMode);
          if (Object.keys(validationErrors).length > 0) {
            appState.checkoutErrors = validationErrors;
            announceToScreenReader('Please review the highlighted checkout fields.');
            renderCheckoutScreen(mainRoot, Data.getSessionState());
            return;
          }

          appState.isSubmittingOrder = true;
          appState.checkoutErrors = {};
          renderCheckoutScreen(mainRoot, Data.getSessionState());

          setTimeout(function () {
            Data.createOrder(draft).then(function (createdOrder) {
              appState.isSubmittingOrder = false;
              announceToScreenReader('Order ' + createdOrder.orderId + ' placed. Redirecting to confirmation.');
              navigateTo('confirmation', createdOrder.orderId);
            }).catch(function (err) {
              appState.isSubmittingOrder = false;
              appState.checkoutErrors = { general: err.message || 'Could not place order.' };
              renderCheckoutScreen(mainRoot, Data.getSessionState());
            });
          }, prefersReducedMotion() ? 20 : 280);
        }
      }, [
        el('span', {
          text: appState.isSubmittingOrder
            ? 'Reserving Branch Stock & Placing Order...'
            : ('Place Order · ' + Data.formatPHP(totals.totalCentavos))
        }),
        !appState.isSubmittingOrder ? Art.createIconSvg('arrow-right', 16) : null
      ])
    ]);

    wrapper.appendChild(el('div', { className: 'checkout-layout' }, [leftCol, rightCol]));
    mainRoot.appendChild(wrapper);
  }

  /* --------------------------------------------------------------------------
     SCREEN 6: ORDER CONFIRMATION (Self-Drawing SVG Check + Display Order #)
     -------------------------------------------------------------------------- */
  function renderConfirmationScreen(mainRoot, session) {
    var targetOrderId = appState.routeParam || session.lastOrderId;

    Data.getOrder(targetOrderId).then(function (order) {
      clearNode(mainRoot);

      if (!order) {
        // Sensible fallback if opened directly without an order
        mainRoot.appendChild(
          el('div', { className: 'confirmation-stage screen-enter' }, [
            el('h1', { className: 'page-title', text: 'No Recent Order Selected' }),
            el('p', { className: 'body-text', text: 'Place a new order from our menu or look up an existing branch order number on the tracking screen.' }),
            el('div', { style: { display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' } }, [
              el('button', {
                type: 'button',
                className: 'btn-primary',
                text: 'Browse Menu',
                onclick: function () { navigateTo('menu'); }
              }),
              el('button', {
                type: 'button',
                className: 'btn-surface',
                text: 'Go to Order Tracking',
                onclick: function () { navigateTo('tracking'); }
              })
            ])
          ])
        );
        return;
      }

      var copyBtn = el('button', {
        type: 'button',
        className: 'btn-surface',
        'aria-label': 'Copy order number ' + order.orderId,
        onclick: function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(order.orderId).catch(function () {});
          }
          clearNode(copyBtn);
          copyBtn.appendChild(Art.createIconSvg('check', 15));
          copyBtn.appendChild(el('span', { text: 'Copied ' + order.orderId }));
          announceToScreenReader('Copied order number ' + order.orderId);
        }
      }, [
        Art.createIconSvg('copy', 15),
        el('span', { text: 'Copy Order Number' })
      ]);

      var stage = el('section', {
        className: 'confirmation-stage screen-enter',
        'aria-labelledby': 'confirm-title'
      }, [
        Art.createConfirmationCheckSvg(),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem' } }, [
          el('span', {
            className: 'helper-text',
            text: order.branchName + ' Branch · ' + (order.fulfillmentMode === 'pickup' ? 'Counter Pick-up' : 'Delivery')
          }),
          el('h1', { id: 'confirm-title', className: 'page-title', text: 'Order Placed' }),
          el('p', {
            className: 'body-text',
            text: 'We have sent your order to the ' + order.branchName + ' kitchen queue and deducted the required recipe ingredients from branch inventory.'
          })
        ]),

        el('div', { className: 'confirm-order-number-box' }, [
          el('span', { className: 'helper-text', text: 'Your Branch Order Reference' }),
          el('p', {
            className: 'display-headline tabular order-code',
            text: order.orderId
          }),
          el('span', {
            className: 'label-text tabular',
            text: order.totals.totalQuantity + (order.totals.totalQuantity === 1 ? ' item' : ' items') + ' · Total ' + Data.formatPHP(order.totals.totalCentavos) + ' (includes ' + Data.formatPHP(order.totals.includedVatCentavos) + ' VAT)'
          }),
          copyBtn
        ]),

        el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' } }, [
          el('button', {
            type: 'button',
            className: 'btn-primary',
            style: { width: '100%', maxWidth: '340px' },
            onclick: function () {
              navigateTo('tracking', order.orderId);
            }
          }, [
            el('span', { text: 'Track Order Status' }),
            Art.createIconSvg('arrow-right', 16)
          ]),
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            onclick: function () {
              navigateTo('staff');
            }
          }, [
            el('span', { text: 'Open Cashier Incoming Queue (Demo Accept Order)' })
          ])
        ])
      ]);

      mainRoot.appendChild(stage);
    });
  }

  /* --------------------------------------------------------------------------
     SCREEN 7: ORDER TRACKING & COHERENT ORDER DETAILS
     -------------------------------------------------------------------------- */
  function renderTrackingScreen(mainRoot, session) {
    var lookupId = appState.routeParam || session.lastOrderId || 'TUN-2048';

    Promise.all([
      Data.getOrder(lookupId),
      Data.listAllOrders()
    ]).then(function (results) {
      var order = results[0];
      var allOrders = results[1];

      clearNode(mainRoot);
      var wrapper = el('div', { className: 'screen-enter' });

      // Top Order Lookup & Switcher Bar
      var lookupInput = el('input', {
        type: 'text',
        className: 'field-input tabular',
        style: { maxWidth: '220px', padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
        placeholder: 'e.g. TUN-2048 or BIN-2049',
        value: appState.trackingLookupInput || lookupId,
        'aria-label': 'Enter order number to track',
        onkeydown: function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var code = e.target.value.trim().toUpperCase();
            if (code) {
              appState.trackingLookupInput = code;
              navigateTo('tracking', code);
            }
          }
        }
      });

      var topLookupRow = el('div', {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.5rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid var(--hairline)',
          flexWrap: 'wrap'
        }
      }, [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
          el('span', { className: 'helper-text', text: 'Real-Time Cross-Tab Status & Coherent Receipt' }),
          el('h1', { className: 'page-title', text: 'Order Tracking & Details' })
        ]),
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' } }, [
          lookupInput,
          el('button', {
            type: 'button',
            className: 'btn-surface',
            text: 'Find Order',
            onclick: function () {
              var val = lookupInput.value.trim().toUpperCase();
              if (val) {
                appState.trackingLookupInput = val;
                navigateTo('tracking', val);
              }
            }
          })
        ])
      ]);

      wrapper.appendChild(topLookupRow);

      // Recent orders quick selector strip
      if (allOrders.length > 0) {
        wrapper.appendChild(
          el('div', {
            style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }
          }, [
            el('span', { className: 'helper-text', text: 'Active demo orders:' })
          ].concat(
            allOrders.slice(0, 5).map(function (o) {
              var isCurr = order && o.orderId === order.orderId;
              return el('button', {
                type: 'button',
                className: isCurr ? 'btn-primary' : 'btn-surface',
                style: { padding: '0.375rem 0.75rem', fontSize: '0.75rem' },
                text: o.orderId + ' (' + o.status + ')',
                onclick: function () {
                  appState.trackingLookupInput = o.orderId;
                  navigateTo('tracking', o.orderId);
                }
              });
            })
          ))
        );
      }

      // Designed Not-Found State
      if (!order) {
        wrapper.appendChild(
          el('div', {
            style: {
              backgroundColor: 'var(--surface-subtle)',
              padding: '3rem 2rem',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }
          }, [
            el('h2', { className: 'section-heading', text: 'Order "' + lookupId + '" Not Found' }),
            el('p', {
              className: 'body-text',
              style: { maxWidth: '50ch' },
              text: 'Check that the branch prefix matches Tunasan (TUN-XXXX) or Biñan (BIN-XXXX), or select one of the active orders above.'
            }),
            el('button', {
              type: 'button',
              className: 'btn-primary',
              text: 'View Sample Order TUN-2048',
              onclick: function () {
                appState.trackingLookupInput = 'TUN-2048';
                navigateTo('tracking', 'TUN-2048');
              }
            })
          ])
        );
        mainRoot.appendChild(wrapper);
        return;
      }

      var steps = Data.getStatusesForMode(order.fulfillmentMode);
      var currentIdx = Math.max(0, steps.indexOf(order.status));
      var fillPercent = steps.length > 1 ? Math.round((currentIdx / (steps.length - 1)) * 100) : 100;
      var isFinished = currentIdx === steps.length - 1;

      var estHeadline = isFinished
        ? (order.fulfillmentMode === 'pickup' ? 'Picked up at counter' : 'Delivered')
        : (order.estimatedMinsRange[0] + '–' + order.estimatedMinsRange[1] + ' min');

      var stepDescriptions = {
        'Order received': 'Sent to ' + order.branchName + ' Branch cashier queue; recipe ingredients deducted from stock.',
        'Preparing': 'Accepted by ' + order.branchName + ' cashier; kitchen is freshly cooking and assembling your order.',
        'Out for delivery': 'Handed to branch rider en route to your delivery address.',
        'Delivered': 'Order completed and handed over at destination.',
        'Ready for pick-up': 'Order is packed and waiting at the ' + order.branchName + ' counter.',
        'Picked up': 'Order collected at the branch counter.'
      };

      // Left Column: Vertical Status Timeline with Filling Spine
      var timelineCol = el('section', {
        className: 'timeline-card',
        'aria-labelledby': 'tracking-status-heading'
      }, [
        el('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1.5px solid var(--color-charcoal)', flexWrap: 'wrap' }
        }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
            el('span', {
              className: 'helper-text',
              text: (order.fulfillmentMode === 'pickup' ? 'Estimated Pick-up Window' : 'Estimated Delivery Time') + ' (' + order.totals.totalQuantity + ' items)'
            }),
            el('h2', {
              id: 'tracking-status-heading',
              className: 'total-amount tabular',
              style: { fontSize: '1.75rem' },
              text: estHeadline
            })
          ]),
          el('div', { style: { textAlign: 'right' } }, [
            el('span', { className: 'helper-text', text: order.branchName + ' Branch' }),
            el('p', { className: 'section-heading tabular', text: 'Order #' + order.orderId })
          ])
        ]),

        el('div', { className: 'vertical-timeline', role: 'list', 'aria-label': 'Order progress steps' }, [
          el('div', { className: 'timeline-spine-track', 'aria-hidden': 'true' }),
          el('div', {
            className: 'timeline-spine-fill',
            'aria-hidden': 'true',
            style: { height: 'calc(' + fillPercent + '% - 24px)' }
          })
        ].concat(
          steps.map(function (stepLabel, idx) {
            var isDone = idx < currentIdx;
            var isCurr = idx === currentIdx;
            var histMatch = (order.history || []).find(function (h) { return h.status === stepLabel; });
            var timeStr = histMatch
              ? new Date(histMatch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return el('div', {
              role: 'listitem',
              'aria-current': isCurr ? 'step' : null,
              className: 'timeline-step' + (isDone ? ' is-completed' : '') + (isCurr ? ' is-current' : '')
            }, [
              el('div', { className: 'timeline-node', 'aria-hidden': 'true' }, [
                isDone
                  ? Art.createIconSvg('check', 15)
                  : el('span', {
                      className: 'tabular',
                      style: { fontSize: '0.75rem', fontWeight: '700' },
                      text: String(idx + 1)
                    })
              ]),
              el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' } }, [
                el('span', { className: 'timeline-step-title', text: stepLabel }),
                timeStr ? el('time', { className: 'helper-text tabular', text: timeStr }) : null
              ]),
              el('p', {
                className: 'body-text',
                style: { fontSize: '0.875rem' },
                text: stepDescriptions[stepLabel] || ''
              })
            ]);
          })
        )),

        el('div', {
          style: { paddingTop: '0.75rem', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }
        }, [
          el('span', { className: 'helper-text', text: 'Updates automatically when the cashier advances this order.' }),
          el('button', {
            type: 'button',
            className: 'btn-secondary',
            onclick: function () { navigateTo('staff'); }
          }, [
            el('span', { text: 'Advance in Cashier Queue' }),
            Art.createIconSvg('arrow-right', 14)
          ])
        ])
      ]);

      // Right Column: Coherent Collapsible Order Details (Items, Sizes, Fulfillment, Payment, Math)
      var detailsCard = el('section', {
        className: 'collapsible-details-card',
        'aria-label': 'Coherent order details and receipt'
      }, [
        el('button', {
          type: 'button',
          className: 'collapsible-trigger',
          'aria-expanded': appState.trackingDetailsExpanded ? 'true' : 'false',
          onclick: function () {
            appState.trackingDetailsExpanded = !appState.trackingDetailsExpanded;
            renderTrackingScreen(mainRoot, session);
          }
        }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.125rem' } }, [
            el('span', { className: 'section-heading', text: 'Order Details & Receipt' }),
            el('span', {
              className: 'helper-text tabular',
              text: order.totals.totalQuantity + ' items · Total ' + Data.formatPHP(order.totals.totalCentavos) + ' · ' + (order.trackingDetailsExpanded ? 'Click to collapse' : 'Click to toggle')
            })
          ]),
          el('span', { className: 'collapsible-chevron' }, [Art.createIconSvg('chevron-down', 18)])
        ]),

        appState.trackingDetailsExpanded
          ? el('div', { className: 'collapsible-body' }, [
              // 1. Fulfillment & Guest Information
              el('div', { style: { paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' } }, [
                el('h3', { className: 'card-title', text: 'Fulfillment & Guest Details' }),
                el('div', { className: 'math-line' }, [
                  el('span', { className: 'helper-text', text: 'Branch' }),
                  el('span', { style: { fontWeight: '600' }, text: order.branchName + ' Branch' })
                ]),
                el('div', { className: 'math-line' }, [
                  el('span', { className: 'helper-text', text: 'Fulfillment Mode' }),
                  el('span', { style: { fontWeight: '600' }, text: order.fulfillmentMode === 'pickup' ? 'Pick-up at Counter' : 'Delivery' })
                ]),
                el('div', { className: 'math-line' }, [
                  el('span', { className: 'helper-text', text: 'Customer Name' }),
                  el('span', { style: { fontWeight: '600', textAlign: 'right', overflowWrap: 'anywhere' }, text: order.customer.fullName })
                ]),
                el('div', { className: 'math-line' }, [
                  el('span', { className: 'helper-text', text: 'Mobile Number' }),
                  el('span', { className: 'tabular', style: { fontWeight: '600' }, text: order.customer.phone })
                ]),
                order.fulfillmentMode === 'delivery'
                  ? el('div', { className: 'math-line' }, [
                      el('span', { className: 'helper-text', text: 'Delivery Address' }),
                      el('span', { style: { fontWeight: '600', textAlign: 'right', maxWidth: '30ch', overflowWrap: 'anywhere' }, text: order.customer.address })
                    ])
                  : el('div', { className: 'math-line' }, [
                      el('span', { className: 'helper-text', text: 'Pick-up Time' }),
                      el('span', { className: 'tabular', style: { fontWeight: '600' }, text: order.customer.pickupTime })
                    ]),
                (order.fulfillmentMode === 'delivery' && order.customer.landmark)
                  ? el('div', { className: 'math-line' }, [
                      el('span', { className: 'helper-text', text: 'Landmark / Notes' }),
                      el('span', { style: { textAlign: 'right', maxWidth: '30ch', overflowWrap: 'anywhere' }, text: order.customer.landmark })
                    ])
                  : null,
                el('div', { className: 'math-line' }, [
                  el('span', { className: 'helper-text', text: 'Payment Method' }),
                  el('span', { style: { fontWeight: '600' }, text: order.payment.methodLabel })
                ])
              ]),

              // 2. Itemized Dishes with Chosen Sizes
              el('div', { style: { paddingTop: '1rem', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: '0.625rem' } }, [
                el('h3', { className: 'card-title', text: 'Ordered Items' })
              ].concat(
                order.lines.map(function (line) {
                  return el('div', {
                    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.875rem' }
                  }, [
                    el('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                      el('span', { style: { fontWeight: '600' }, text: line.name }),
                      el('span', { className: 'helper-text tabular', text: line.optionLabel + ' · Qty ' + line.quantity + ' × ' + Data.formatPHP(line.unitPriceCentavos) })
                    ]),
                    el('span', { className: 'tabular', style: { fontWeight: '700' }, text: Data.formatPHP(line.lineTotalCentavos) })
                  ]);
                })
              )),

              // 3. Exact Price & VAT Breakdown
              el('div', { className: 'math-breakdown' }, [
                el('div', { className: 'math-line' }, [
                  el('span', { text: 'Subtotal (VAT-inclusive)' }),
                  el('span', { className: 'tabular', style: { fontWeight: '600' }, text: Data.formatPHP(order.totals.subtotalCentavos) })
                ]),
                el('div', { className: 'math-line' }, [
                  el('span', { text: order.fulfillmentMode === 'pickup' ? 'Pick-up Fee' : 'Delivery Fee' }),
                  el('span', {
                    className: 'tabular',
                    style: { fontWeight: '600' },
                    text: order.fulfillmentMode === 'pickup' ? 'Free (₱0.00)' : Data.formatPHP(order.totals.deliveryFeeCentavos)
                  })
                ]),
                el('div', { className: 'math-line-total' }, [
                  el('span', { className: 'card-title', text: 'Total' }),
                  el('span', { className: 'total-amount tabular', text: Data.formatPHP(order.totals.totalCentavos) })
                ]),
                el('div', { className: 'math-line-vat' }, [
                  el('span', { text: 'Includes 12% VAT (Total × 12 ÷ 112)' }),
                  el('span', { className: 'tabular', text: Data.formatPHP(order.totals.includedVatCentavos) })
                ])
              ]),

              // 4. Back to Home / Order Again
              el('div', { style: { paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                el('button', {
                  type: 'button',
                  className: 'btn-secondary',
                  onclick: function () { navigateTo('home'); }
                }, [
                  Art.createIconSvg('arrow-left', 14),
                  el('span', { text: 'Back to Home' })
                ]),
                el('button', {
                  type: 'button',
                  className: 'btn-surface',
                  text: 'Order Again from Menu',
                  onclick: function () { navigateTo('menu'); }
                })
              ])
            ])
          : null
      ]);

      wrapper.appendChild(el('div', { className: 'tracking-layout' }, [timelineCol, detailsCard]));
      mainRoot.appendChild(wrapper);
    });
  }

  /* --------------------------------------------------------------------------
     SCREEN 8: CASHIER INCOMING ORDERS QUEUE (With Mock Sign-In & Branch Isolation)
     -------------------------------------------------------------------------- */
  function formatElapsedMinutes(timestamp) {
    var diffSec = Math.max(0, Math.floor((Date.now() - Number(timestamp || Date.now())) / 1000));
    if (diffSec < 45) return 'Just now';
    var mins = Math.floor(diffSec / 60);
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    return hrs + 'h ' + (mins % 60) + 'm ago';
  }

  function renderStaffScreen(mainRoot, session) {
    clearNode(mainRoot);
    var demoAccounts = Data.getDemoStaffAccounts();
    var activeStaff = session.staffSession;

    // 1. If not signed in, show light front-end Mock Staff Sign-In
    if (!activeStaff) {
      var userField = el('input', {
        id: 'staff-username-input',
        type: 'text',
        className: 'field-input',
        value: 'cashier.tunasan',
        placeholder: 'cashier.tunasan or cashier.binan'
      });
      var passField = el('input', {
        id: 'staff-passcode-input',
        type: 'password',
        className: 'field-input tabular',
        value: '1234',
        placeholder: '1234'
      });

      var signInView = el('div', {
        className: 'screen-enter',
        style: { maxWidth: '580px', margin: '1rem auto' }
      }, [
        el('div', { className: 'staff-banner' }, [
          el('span', {
            className: 'helper-text',
            style: { color: 'var(--ink-primary)' },
            text: 'Front-End Prototype Disclosure: Staff sign-in and branch isolation are simulated in localStorage for classroom demonstration. Real authentication and RBAC belong on a backend server.'
          })
        ]),

        el('div', { className: 'checkout-step-section' }, [
          el('h1', { className: 'page-title', text: 'Cashier Queue Sign-In' }),
          el('p', {
            className: 'body-text',
            text: 'Sign in with a branch cashier profile to demonstrate the Branch Isolation policy: each cashier sees and manages only the incoming orders and ingredient inventory of their assigned branch.'
          }),

          // Instant 1-Click Demo Profiles
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.625rem' } }, [
            el('span', { className: 'label-text', style: { fontWeight: '600' }, text: 'Quick Demo Sign-In (1-Click):' }),
            el('div', { className: 'form-grid' },
              demoAccounts.map(function (acc) {
                return el('button', {
                  type: 'button',
                  className: 'btn-primary',
                  style: { justifyContent: 'space-between', width: '100%' },
                  onclick: function () {
                    appState.staffLoginError = '';
                    Data.signInStaff(acc.username, acc.passcode).then(function () {
                      announceToScreenReader('Signed in as ' + acc.displayName + ' (' + acc.branchName + ' Branch).');
                      renderApp(false);
                    });
                  }
                }, [
                  el('span', { text: acc.branchName + ' Cashier (' + acc.displayName + ')' }),
                  Art.createIconSvg('arrow-right', 15)
                ]);
              })
            )
          ]),

          // Manual Credentials Form
          el('div', {
            style: { paddingTop: '1rem', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: '1rem' }
          }, [
            el('span', { className: 'helper-text', text: 'Or sign in with demo credentials (passcode: 1234):' }),
            el('div', { className: 'form-grid' }, [
              el('div', { className: 'form-field' }, [
                el('label', { className: 'field-label', for: 'staff-username-input', text: 'Demo Username' }),
                userField
              ]),
              el('div', { className: 'form-field' }, [
                el('label', { className: 'field-label', for: 'staff-passcode-input', text: 'Passcode' }),
                passField
              ])
            ]),
            appState.staffLoginError
              ? el('div', { className: 'field-error-msg', role: 'alert' }, [
                  Art.createIconSvg('warning-octagon', 15),
                  el('span', { text: appState.staffLoginError })
                ])
              : null,
            el('button', {
              type: 'button',
              className: 'btn-surface',
              text: 'Sign In to Branch Queue',
              onclick: function () {
                Data.signInStaff(userField.value, passField.value).then(function () {
                  appState.staffLoginError = '';
                  renderApp(false);
                }).catch(function (err) {
                  appState.staffLoginError = err.message;
                  renderStaffScreen(mainRoot, Data.getSessionState());
                });
              }
            })
          ])
        ])
      ]);

      mainRoot.appendChild(signInView);
      return;
    }

    // 2. Signed-In Cashier Workspace (Enforces Branch Isolation)
    Promise.all([
      Data.listOrdersByBranch(activeStaff.branchId),
      Data.getBranchInventory(activeStaff.branchId)
    ]).then(function (results) {
      var branchOrders = results[0];
      var branchInventory = results[1];

      var activeOrders = branchOrders.filter(function (o) {
        return o.status !== 'Delivered' && o.status !== 'Picked up';
      });
      var completedOrders = branchOrders.filter(function (o) {
        return o.status === 'Delivered' || o.status === 'Picked up';
      });

      var wrapper = el('div', { className: 'screen-enter' });

      // Honesty & Branch Isolation Header Bar
      wrapper.appendChild(
        el('div', { className: 'staff-banner' }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.125rem' } }, [
            el('span', {
              className: 'label-text',
              style: { fontWeight: '700' },
              text: 'Branch Isolation Active: Showing ONLY ' + activeStaff.branchName + ' Branch (' + (activeStaff.branchId === 'tunasan' ? 'TUN' : 'BIN') + ') Orders & Inventory'
            }),
            el('span', {
              className: 'helper-text',
              text: 'Signed in as ' + activeStaff.displayName + ' (' + activeStaff.role + ') · Front-end role simulation · Advancing an order updates customer tracking across tabs.'
            })
          ]),
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' } }, [
            // 1-Click switch to the other branch's cashier to verify isolation
            demoAccounts.map(function (acc) {
              var isCurrent = acc.branchId === activeStaff.branchId;
              return el('button', {
                type: 'button',
                className: isCurrent ? 'btn-primary' : 'btn-surface',
                style: { padding: '0.4375rem 0.75rem', fontSize: '0.75rem' },
                text: acc.branchName + ' Cashier',
                onclick: function () {
                  if (!isCurrent) {
                    Data.signInStaff(acc.username, acc.passcode).then(function () {
                      renderApp(false);
                    });
                  }
                }
              });
            }),
            el('button', {
              type: 'button',
              className: 'btn-secondary',
              style: { fontSize: '0.8125rem' },
              text: 'Sign Out',
              onclick: function () {
                Data.signOutStaff().then(function () {
                  renderApp(false);
                });
              }
            })
          ])
        ])
      );

      // Workspace Title & Segmented View Tabs
      var tabOptions = [
        {
          id: 'queue',
          label: 'Incoming & Active Queue',
          rightText: String(activeOrders.length),
          sublabel: activeStaff.branchName + ' active orders'
        },
        {
          id: 'completed',
          label: 'Completed Orders',
          rightText: String(completedOrders.length),
          sublabel: 'Delivered or Picked up'
        },
        {
          id: 'inventory',
          label: 'Branch Stock & Deductions',
          rightText: String(branchInventory.items.length),
          sublabel: 'Live ingredient ledger'
        }
      ];

      wrapper.appendChild(
        el('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }
        }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } }, [
            el('span', { className: 'helper-text', text: activeStaff.branchName + ' Branch Operations' }),
            el('h1', { className: 'page-title', text: 'Cashier Incoming Orders' })
          ]),
          el('div', { style: { minWidth: 'min(100%, 560px)', flex: '0 1 620px' } }, [
            createSegmentedControl(tabOptions, appState.staffActiveTab, function (nextTab) {
              appState.staffActiveTab = nextTab;
              renderStaffScreen(mainRoot, Data.getSessionState());
            }, 'Cashier view tabs')
          ])
        ])
      );

      // Tab 1 & 2: Order Queue Cards
      if (appState.staffActiveTab === 'queue' || appState.staffActiveTab === 'completed') {
        var listToRender = appState.staffActiveTab === 'queue' ? activeOrders : completedOrders;

        if (listToRender.length === 0) {
          wrapper.appendChild(
            el('div', {
              style: {
                backgroundColor: 'var(--surface-subtle)',
                padding: '3rem 2rem',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.875rem'
              }
            }, [
              el('h2', {
                className: 'section-heading',
                text: appState.staffActiveTab === 'queue'
                  ? ('No active incoming orders for ' + activeStaff.branchName + ' Branch')
                  : ('No completed orders yet for ' + activeStaff.branchName + ' Branch')
              }),
              el('p', {
                className: 'body-text',
                text: 'Place a customer order for ' + activeStaff.branchName + ' Branch to see it arrive here immediately.'
              }),
              el('button', {
                type: 'button',
                className: 'btn-primary',
                text: 'Go to Customer Menu',
                onclick: function () { navigateTo('menu'); }
              })
            ])
          );
        } else {
          var cards = listToRender.map(function (order) {
            var steps = Data.getStatusesForMode(order.fulfillmentMode);
            var currIdx = steps.indexOf(order.status);
            var nextStatus = (currIdx !== -1 && currIdx < steps.length - 1) ? steps[currIdx + 1] : null;

            var actionLabel = '';
            if (order.status === 'Order received') {
              actionLabel = 'Accept & Start Preparing';
            } else if (order.status === 'Preparing') {
              actionLabel = order.fulfillmentMode === 'pickup'
                ? 'Mark Ready for Pick-up'
                : 'Dispatch — Out for Delivery';
            } else if (nextStatus) {
              actionLabel = 'Mark as ' + nextStatus;
            }

            return el('article', { className: 'queue-order-card' }, [
              el('div', { style: { display: 'flex', flexDirection: 'column', gap: '1rem' } }, [
                el('div', { className: 'queue-card-top' }, [
                  el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.125rem' } }, [
                    el('span', {
                      className: 'total-amount tabular order-code',
                      text: order.orderId
                    }),
                    el('span', {
                      className: 'label-text',
                      style: { fontWeight: '600' },
                      text: (order.fulfillmentMode === 'pickup' ? 'Pick-up' : 'Delivery') + ' · ' + order.customer.fullName + ' (' + order.customer.phone + ')'
                    })
                  ]),
                  el('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' } }, [
                    el('span', {
                      className: 'label-text',
                      style: { fontWeight: '700' },
                      text: 'Status: ' + order.status
                    }),
                    el('time', {
                      className: 'helper-text tabular',
                      text: 'Arrived ' + formatElapsedMinutes(order.createdAt)
                    })
                  ])
                ]),

                // Plain, high-legibility itemized list
                el('ul', { className: 'queue-items-list', 'aria-label': 'Ordered items' },
                  order.lines.map(function (line) {
                    return el('li', { className: 'queue-item-line' }, [
                      el('span', {
                        className: 'tabular',
                        text: line.quantity + '× ' + line.name + ' (' + line.optionLabel + ')'
                      }),
                      el('span', {
                        className: 'tabular',
                        style: { fontWeight: '500', color: 'var(--ink-secondary)' },
                        text: Data.formatPHP(line.lineTotalCentavos)
                      })
                    ]);
                  })
                ),

                el('div', {
                  style: { paddingTop: '0.625rem', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }
                }, [
                  el('span', {
                    className: 'helper-text',
                    text: order.payment.methodLabel + (order.fulfillmentMode === 'delivery' ? (' · ' + order.customer.address) : (' · ' + order.customer.pickupTime))
                  }),
                  el('span', {
                    className: 'tabular',
                    style: { fontWeight: '700' },
                    text: 'Total ' + Data.formatPHP(order.totals.totalCentavos)
                  })
                ])
              ]),

              // Primary Action to Accept & Advance Order + Link to Customer Tracking
              el('div', {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.5rem', flexWrap: 'wrap' }
              }, [
                el('button', {
                  type: 'button',
                  className: 'btn-secondary',
                  style: { fontSize: '0.8125rem' },
                  onclick: function () {
                    appState.trackingLookupInput = order.orderId;
                    navigateTo('tracking', order.orderId);
                  }
                }, [
                  el('span', { text: 'Inspect Customer Tracking View' })
                ]),

                nextStatus
                  ? el('button', {
                      type: 'button',
                      className: 'btn-primary',
                      onclick: function () {
                        Data.updateOrderStatus(
                          order.orderId,
                          nextStatus,
                          activeStaff.displayName + ' (' + activeStaff.branchName + ' Cashier)'
                        ).then(function () {
                          announceToScreenReader('Order ' + order.orderId + ' advanced to ' + nextStatus);
                          renderStaffScreen(mainRoot, Data.getSessionState());
                        });
                      }
                    }, [
                      el('span', { text: actionLabel }),
                      Art.createIconSvg('arrow-right', 15)
                    ])
                  : el('span', { className: 'label-text', style: { fontWeight: '700' }, text: 'Completed' })
              ])
            ]);
          });

          wrapper.appendChild(el('div', { className: 'queue-grid' }, cards));
        }
      } else {
        // Tab 3: Branch Inventory & Recipe Deduction Ledger
        var invSection = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } }, [
            el('h2', {
              className: 'section-heading',
              text: activeStaff.branchName + ' Kitchen Ingredient Stock'
            }),
            el('p', {
              className: 'body-text',
              text: 'Every customer order placed at ' + activeStaff.branchName + ' Branch automatically deducts its recipe ingredients below. When an ingredient reaches 0, dishes requiring it become unavailable on the menu.'
            }),
            el('div', { className: 'inventory-ledger-grid' },
              branchInventory.items.map(function (ing) {
                var isDepleted = ing.quantity <= 0;
                return el('div', {
                  className: 'inventory-item-box',
                  style: isDepleted ? { border: '2px solid var(--color-charcoal)', backgroundColor: 'var(--surface-elevated)' } : null
                }, [
                  el('span', { className: 'card-title', text: ing.name }),
                  el('span', {
                    className: 'total-amount tabular',
                    text: ing.quantity + ' ' + ing.unit
                  }),
                  el('span', {
                    className: 'helper-text',
                    style: isDepleted ? { fontWeight: '700', color: 'var(--ink-primary)' } : null,
                    text: isDepleted ? 'Depleted (Dependent dishes unavailable)' : 'Available in branch kitchen'
                  })
                ]);
              })
            )
          ]),

          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } }, [
            el('h2', { className: 'section-heading', text: 'Recent Recipe Deduction Log (' + activeStaff.branchName + ')' }),
            el('div', { className: 'deals-ledger-list' },
              branchInventory.deductionLog.map(function (entry) {
                return el('div', {
                  style: { display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid var(--hairline)', flexWrap: 'wrap' }
                }, [
                  el('div', { style: { display: 'flex', gap: '0.75rem', alignItems: 'baseline' } }, [
                    el('span', { className: 'card-title tabular', text: entry.orderId }),
                    el('span', { className: 'body-text', style: { fontSize: '0.875rem' }, text: entry.summary })
                  ]),
                  el('time', { className: 'helper-text tabular', text: formatElapsedMinutes(entry.timestamp) })
                ]);
              })
            )
          ])
        ]);

        wrapper.appendChild(invSection);
      }

      mainRoot.appendChild(wrapper);
    });
  }

  /* --------------------------------------------------------------------------
     Master Render Orchestrator
     -------------------------------------------------------------------------- */
  function renderApp(useTransition) {
    var session = Data.getSessionState();
    var mainRoot = document.getElementById('main-view-root');
    if (!mainRoot) return;

    var doRender = function () {
      renderHeader(session);
      renderFooter(session);
      renderModalHost();

      if (appState.route === 'home') {
        renderHomeScreen(mainRoot, session);
      } else if (appState.route === 'menu') {
        renderMenuScreen(mainRoot, session);
      } else if (appState.route === 'item') {
        renderFoodDetailsScreen(mainRoot, session);
      } else if (appState.route === 'cart') {
        renderCartScreen(mainRoot, session);
      } else if (appState.route === 'checkout') {
        renderCheckoutScreen(mainRoot, session);
      } else if (appState.route === 'confirmation') {
        renderConfirmationScreen(mainRoot, session);
      } else if (appState.route === 'tracking') {
        renderTrackingScreen(mainRoot, session);
      } else if (appState.route === 'staff') {
        renderStaffScreen(mainRoot, session);
      } else {
        renderHomeScreen(mainRoot, session);
      }
    };

    if (useTransition) {
      runWithViewTransition(doRender, true);
    } else {
      doRender();
    }
  }

  /* --------------------------------------------------------------------------
     Boot & Event Listeners
     -------------------------------------------------------------------------- */
  function initApp() {
    var config = Data.getConfig();
    document.title = config.brandName + ' — ' + config.tagline;

    global.addEventListener('hashchange', function () {
      parseHashAndRoute();
    });

    // Listen for cross-tab storage / BroadcastChannel updates (e.g. Cashier advancing order)
    Data.onStateChange(function (reason) {
      if (reason === 'broadcast' || reason === 'storage_event') {
        renderApp(false);
      }
    });

    parseHashAndRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window);
