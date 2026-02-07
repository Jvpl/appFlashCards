import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  flexOne: { flex: 1 }, // Adicionado para GestureHandlerRootView
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' },
  baseContainer: { flex: 1, backgroundColor: '#1A202C' },
  studyContainer: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  glow: { position: 'absolute', opacity: 0, width: 100, height: '100%'},
  glowLeft: { left: 0, top: 0, bottom: 0},
  glowRight: { right: 0, top: 0, bottom: 0},
  glowTop: { top: 0, left: 0, right: 0, height: 100, width: '100%' },
  cardWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
  itemContainer: { backgroundColor: '#2D3748', padding: 20, marginVertical: 8, marginHorizontal: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressSubjectContainer: { backgroundColor: '#2D3748', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTextContainer: { flex: 1, marginRight: 16 },
  itemTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  itemSubtitle: { fontSize: 14, color: '#A0AEC0', marginTop: 4 },
  progressContainer: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: '#4FD1C5', justifyContent: 'center', alignItems: 'center' },
  progressText: { color: '#FFFFFF', fontWeight: 'bold' },
  cardContainer: { position: 'absolute' },
  card: { width: screenWidth * 0.9, height: 380, backgroundColor: '#4A5568', borderRadius: 15, justifyContent: 'space-between', alignItems: 'center', padding: 0, backfaceVisibility: 'hidden', borderWidth: 2, borderColor: 'transparent', overflow: 'hidden'},
  cardBack: { backgroundColor: '#2D3748', position: 'absolute', top: 0, justifyContent: 'space-between', backfaceVisibility: 'hidden' },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    borderRadius: 15,
  },
  cardContentScrollView: { flex: 1, width: '100%'},
  cardContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardText: { fontSize: 22, color: '#FFFFFF', textAlign: 'center' },
  noCardsText: { fontSize: 18, color: '#A0AEC0', textAlign: 'center', paddingHorizontal: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.2)', width: '100%' },
  levelCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: '#1A202C' },
  levelText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 32 },
  progressBarContainer: { height: 16, backgroundColor: '#1A202C', borderRadius: 50, overflow: 'hidden', justifyContent: 'center' },
  progressPercentageText: { position: 'absolute', alignSelf: 'center', color: 'white', fontWeight: 'bold', fontSize: 10 },
  levelNamesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  levelName: { fontSize: 13, color: '#9CA3AF', fontWeight: 'bold' },
  swipeGuideContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  swipeGuideText: { color: '#A0AEC0', fontSize: 16, fontWeight: 'bold' },
  feedbackText: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  progressIndicator: { position: 'absolute', bottom: 20, alignItems: 'center' },
  userCreatedBanner: { backgroundColor: '#2D3748', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  userCreatedText: { color: '#4FD1C5', fontSize: 12, fontWeight: 'bold' },
  fab: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#4FD1C5', borderRadius: 28, elevation: 8, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { height: 2, width: 0 } },
  formContainer: { flex: 1, backgroundColor: '#1A202C', padding: 20 },
  formLabel: { fontSize: 16, color: 'white', marginBottom: 8, marginTop: 16 },
  formInput: {
    backgroundColor: '#2D3748',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top'
  },
  // Container unificado para MathInput (WebView)
  mathInputContainerUnified: {
    minHeight: 200, // VOLTEI PARA 200 (Era o tamanho original grande)
    flex: 1, // Garante que ele cres�a se precisar
    backgroundColor: '#2D3748',
    borderRadius: 8,
    overflow: 'hidden',
    // BORDA PADR�O INVIS�VEL (Cor do fundo)
    // Isso resolve o problema de parecer ativo sem estar
    borderWidth: 2, 
    borderColor: '#2D3748', 
    marginBottom: 10,
  },
  
  // Estilo aplicado APENAS quando o MathInput est� focado
  mathInputContainerFocused: {
    borderColor: '#4FD1C5', // Aqui sim fica verde
  },
  // Estilo para a WebView interna
  webviewStyle: {
    flex: 1,
    backgroundColor: '#2D3748', // Garante a cor de fundo
    opacity: 0.99, // Hack para evitar piscar em alguns dispositivos
  },
   // Altura maior na tela de cria��o (Aplicado ao container)
  mathInputContainerUnifiedLarge: {
     minHeight: 180, // Altura m�nima maior
     flex: 1, // Continua flex�vel
  },
  // Container para agrupar Label + Input na tela de Cria��o
  inputGroup: {
      marginBottom: 10, // Espa�o entre os grupos
      flex: 1, // Ocupa espa�o vertical dispon�vel
  },
  // Container para os controles inferiores (f(x) e Salvar)
  bottomControlsContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between', // Espa�a os bot�es
     marginTop: 15,
     marginBottom: 10, // Espa�o antes de talvez a toolbar aparecer
     paddingHorizontal: 5, // Pequeno padding lateral
  },
  saveButtonContainer: {
      flex: 1, // Ocupa espa�o restante
      marginLeft: 15, // Espa�o entre f(x) e Salvar
  },
  // Bot�o f(x)
  fxButton: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'center', // Centraliza verticalmente com o bot�o Salvar
  },
  fxButtonActive: {
    backgroundColor: '#4FD1C5',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fxButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para o Teclado/Toolbar Matem�tica Nativa
  mathKeyboardOverlay: {
    backgroundColor: '#252E3D',
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
    paddingTop: 8,
    // paddingBottom ser� tratado pelo Safe Area
  },
  mathToolbarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingBottom: 5, // Espa�o inferior
  },
  mathToolbarButton: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    paddingVertical: 10,
    margin: 4,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathToolbarButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Ajuste no padding do formContainer para o KeyboardAvoidingView
  formContainerNoPadding: {
     flex: 1,
     backgroundColor: '#1A202C'
  },
  scrollContentContainer: {
     flexGrow: 1, // Permite o scroll crescer
     padding: 20, // Padding aplicado aqui
     justifyContent: 'flex-start', // Come�a do topo
  },
  progressTitle: { fontSize: 24, color: 'white', fontWeight: 'bold' },
  progressValue: { fontSize: 48, color: '#4FD1C5', fontWeight: 'bold', marginVertical: 10 },
  progressSubtitle: { fontSize: 16, color: '#A0AEC0' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16, backgroundColor: '#2D3748', borderRadius: 8, marginHorizontal: 16, overflow: 'hidden' },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#4FD1C5' },
  toggleButtonText: { color: '#A0AEC0', fontWeight: 'bold' },
  toggleButtonTextActive: { color: '#FFFFFF' },
  deckGroup: { marginBottom: 16, marginHorizontal: 16, backgroundColor: '#2D3748', borderRadius: 10, overflow: 'hidden' },
  deckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#252E3D' },
  deckGroupTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold', flex: 1 },
  noItemsText: { color: '#A0AEC0', textAlign: 'center', marginTop: 40, fontSize: 16 },
  divider: { height: 1, backgroundColor: '#4A5568', marginHorizontal: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  alertModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: '#2D3748', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpIcon: {
    padding: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formInputWithCounter: {
    flex: 1,
    marginRight: 8,
  },
  charCounter: {
    fontSize: 13,
    color: '#A0AEC0',
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  charCounterWarning: {
    color: '#F59E0B', // Amarelo quando >= 70%
  },
  charCounterError: {
    color: '#EF4444', // Vermelho quando >= 90%
  },

  // ========== ESTILOS DO NOVO MODAL FULLSCREEN ==========
  // Modal Fullscreen com Glassmorphism
  modalOverlayFullscreen: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  modalContentFullscreen: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.95)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.3)',
  },
  modalHeaderFullscreen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleFullscreen: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  modalInputFocusedGreen: {
    borderColor: '#4FD1C5',
    borderWidth: 2,
  },

  // Contadores Segmentados
  segmentedCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  segmentedCounterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedCounterDivider: {
    color: '#4A5568',
    marginHorizontal: 8,
    fontSize: 12,
  },

  // Teclado Colaps�vel
  keypadContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  keypadToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  keypadToggle: {
    backgroundColor: '#4A5568',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  keypadToggleActive: {
    backgroundColor: '#4FD1C5',
  },
  keypadToggleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  keypadPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  keypadButton: {
    backgroundColor: '#4A5568',
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  keypadButtonDisabled: {
    opacity: 0.3,
  },
  keypadButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  keypadButtonTextDisabled: {
    color: '#718096',
  },

  // Bot�es Fullwidth do Modal
  modalButtonFullWidth: {
    backgroundColor: '#4FD1C5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancelFullWidth: {
    backgroundColor: '#4A5568',
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextFullWidth: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Input do Modal com foco verde
  modalInputWithFocus: {
    backgroundColor: '#1A202C',
    color: 'white',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#4A5568',
  },
  // ========================================================

  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 15, borderRadius: 10, marginBottom: 10 },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  userSubjectsDividerContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10 },
  userSubjectsDivider: { flex: 1, height: 1, backgroundColor: '#4A5568' },
  userSubjectsDividerText: { color: '#A0AEC0', marginHorizontal: 10, fontWeight: 'bold' },
  subjectRightContainer: {flexDirection: 'row', alignItems: 'center'},
  subjectOptionsButton: {paddingLeft: 16, paddingVertical: 10},
  searchContainer: { marginHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: '#2D3748', color: 'white', borderRadius: 8, padding: 12, fontSize: 16 },
  alertContent: { backgroundColor: '#2D3748', borderRadius: 15, padding: 20, width: '80%', alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  alertMessage: { fontSize: 16, color: '#A0AEC0', textAlign: 'center', marginBottom: 20 },
  alertButtonContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  alertButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: 10, minWidth: 80, alignItems: 'center' },
  alertConfirmButton: { backgroundColor: '#4FD1C5' },
  alertCancelButton: { backgroundColor: '#4A5568' },
  alertButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  progressHeader: { alignItems: 'center', marginBottom: 30, paddingTop: 50 }, // Added padding
  settingsSection: { marginBottom: 12, paddingHorizontal: 16, paddingTop: 12 },
  settingsSectionTitle: { fontSize: 14, fontWeight: '600', color: '#A0AEC0', marginBottom: 12, letterSpacing: 0.5 },
  settingsButton: { backgroundColor: '#2D3748', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  switchContainer: { width: 50, height: 30, borderRadius: 15, backgroundColor: '#4A5568', padding: 3, justifyContent: 'center' },
  switchActive: { backgroundColor: '#22C55E' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  switchThumbActive: { alignSelf: 'flex-end' },
  dangerButton: {},
  settingsButtonTextContainer: { marginLeft: 15, flex: 1 },
  settingsButtonTitle: { fontSize: 16, color: 'white', fontWeight: 'bold' },
  settingsButtonSubtitle: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  

  editorContainer: {
    flex: 1,
    minHeight: 150,
  },

  editorContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center', // Alinhamento central vertical
    padding: 8, // Padding reduzido
  },
  
  // TEXTO COMUM
  nativeInputText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'serif',
    paddingVertical: 4,
    marginVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // --- FRA��O ---
  fractionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  fractionInputWrapper: {
    borderWidth: 1,
    borderColor: '#4A5568', // Borda da caixa
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)', // Fundo escuro sutil
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  fractionInput: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'serif',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    minWidth: 14,
  },
  fractionLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: 'white',
    marginVertical: 2,
  },

  // --- RAIZ ---
  rootContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Alinha a base
    marginRight: 4,
    marginLeft: 2,
  },
  rootSymbolWrapper: {
    justifyContent: 'flex-end',
    marginBottom: -6, // Ajuste para alinhar a base do s�mbolo com o texto
    marginRight: -2,  // Conecta com a linha superior
  },
  rootSymbolText: {
    color: 'white',
    fontSize: 28, // Tamanho maior para o s�mbolo
    fontFamily: 'serif',
    fontWeight: '300',
  },
  rootContentWrapper: {
    borderTopWidth: 1.5,
    borderTopColor: 'white',
    paddingTop: 2,
    paddingLeft: 2,
    paddingRight: 2,
    marginBottom: 5, // Levanta o conte�do para ficar sob o teto
  },
  rootInput: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'serif',
    padding: 0,
    margin: 0,
    minWidth: 10,
    textAlign: 'center',
  },
  
  // Multi-select styles
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDeckItem: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    borderColor: '#4FD1C5',
    borderWidth: 1,
  },
  
  cursor: {
      width: 2, 
      height: 16, 
      backgroundColor: '#4FD1C5'
  },

});

// =================================================================
// APP ROOT
// Configura��o da navega��o e renderiza��o principal.
// =================================================================

// Mant�m a tela de splash vis�vel enquanto as fontes carregam
// SplashScreen.preventAutoHideAsync();

// Tema customizado para evitar o "flash" de tela branca
export default styles;
