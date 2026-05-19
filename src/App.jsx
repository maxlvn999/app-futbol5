import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [confirmados, setConfirmados] = useState([]);
  const [equipoA, setEquipoA] = useState([]);
  const [equipoB, setEquipoB] = useState([]);
  const [equiposListos, setEquiposListos] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  // Estados de gestión de la lista completa
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarGestion, setMostrarGestion] = useState(false);

  // NUEVO: Estado para el modo de partido manual/personalizado
  const [modoPersonalizado, setModoPersonalizado] = useState(false);

  const obtenerJugadores = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('jugadores')
        .select('*');

      if (error) {
        console.error('Error de Supabase:', error.message);
      } else {
        const ordenadosPorPuntos = (data || []).sort((a, b) => b.puntos - a.puntos);
        setJugadores(ordenadosPorPuntos);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
    }
    setCargando(false);
  };

  useEffect(() => {
    obtenerJugadores();
  }, []);

  const agregarJugador = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    try {
      const { error } = await supabase
        .from('jugadores')
        .insert([{ nombre: nuevoNombre.trim(), puntos: 0 }]);

      if (error) {
        alert('Error al agregar: ' + error.message);
      } else {
        setNuevoNombre('');
        await obtenerJugadores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarJugador = async (id, nombre, e) => {
    e.stopPropagation(); 
    if (!confirm(`¿Seguro que querés borrar a ${nombre} del sistema?`)) return;

    try {
      const { error } = await supabase
        .from('jugadores')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        setConfirmados(confirmados.filter(c => c.id !== id));
        setEquipoA(equipoA.filter(j => j.id !== id));
        setEquipoB(equipoB.filter(j => j.id !== id));
        setEquiposListos(false);
        await obtenerJugadores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const anotadoConfirmado = (jugador) => {
    if (confirmados.some(c => c.id === jugador.id)) {
      setConfirmados(confirmados.filter(c => c.id !== jugador.id));
      setEquiposListos(false);
      return;
    }

    if (confirmados.length < 10) {
      setConfirmados([...confirmados, jugador]);
      setEquiposListos(false);
    } else {
      alert("¡Ya tenés los 10 confirmados!");
    }
  };

  const armarEquiposSerpentina = () => {
    if (confirmados.length !== 10) return;

    const ordenadosPorNivel = [...confirmados].sort((a, b) => b.puntos - a.puntos);
    const a = [];
    const b = [];

    ordenadosPorNivel.forEach((jugador, index) => {
      if (index === 0 || index === 3 || index === 4 || index === 7 || index === 8) {
        a.push(jugador);
      } else {
        b.push(jugador);
      }
    });

    setEquipoA(a);
    setEquipoB(b);
    setEquiposListos(true);
  };

  // NUEVO: Funciones para asignar manualmente a los equipos en el modo personalizado
  const asignarAEquipoManual = (jugador, destino) => {
    // Si ya está en ese equipo, lo sacamos
    if (destino === 'A' && equipoA.some(j => j.id === jugador.id)) {
      setEquipoA(equipoA.filter(j => j.id !== jugador.id));
      return;
    }
    if (destino === 'B' && equipoB.some(j => j.id === jugador.id)) {
      setEquipoB(equipoB.filter(j => j.id !== jugador.id));
      return;
    }

    // Validar que no se metan más de 5 por equipo
    if (destino === 'A' && equipoA.length >= 5) return alert("El Equipo A ya está lleno (máx 5).");
    if (destino === 'B' && equipoB.length >= 5) return alert("El Equipo B ya está lleno (máx 5).");

    // Sacar de un equipo si se lo mueve al otro
    if (destino === 'A') {
      setEquipoB(equipoB.filter(j => j.id !== jugador.id));
      setEquipoA([...equipoA, jugador]);
    } else {
      setEquipoA(equipoA.filter(j => j.id !== jugador.id));
      setEquipoB([...equipoB, jugador]);
    }
  };

  const registrarResultado = async (resultado) => {
    if (!confirm('¿Estás seguro de registrar este resultado? Esto actualizará la tabla general.')) return;
    setActualizando(true);

    // En modo personalizado juntamos los integrantes de ambos arrays para saber a quiénes actualizar
    const todosLosJugadoresDelPartido = modoPersonalizado ? [...equipoA, ...equipoB] : confirmados;

    try {
      const promesas = todosLosJugadoresDelPartido.map(jugador => {
        let nuevosPuntos = jugador.puntos;

        if (resultado === 'empate') {
          nuevosPuntos += 1;
        } else if (resultado === 'ganaA' && equipoA.some(j => j.id === jugador.id)) {
          nuevosPuntos += 3;
        } else if (resultado === 'ganaB' && equipoB.some(j => j.id === jugador.id)) {
          nuevosPuntos += 3;
        }

        return supabase
          .from('jugadores')
          .update({ puntos: nuevosPuntos })
          .eq('id', jugador.id);
      });

      await Promise.all(promesas);
      alert('¡Puntajes actualizados con éxito en la nube! 🏆');
      
      // Limpieza de estados generales
      setConfirmados([]);
      setEquipoA([]);
      setEquipoB([]);
      setEquiposListos(false);
      setModoPersonalizado(false);
      await obtenerJugadores();
    } catch (err) {
      console.error('Error al actualizar puntos:', err);
      alert('Hubo un error al guardar los puntos.');
    } finally {
      setActualizando(false);
    }
  };

  const resetearTodo = () => {
    setConfirmados([]);
    setEquipoA([]);
    setEquipoB([]);
    setEquiposListos(false);
    setModoPersonalizado(false);
  };

  const calcularTotalPuntos = (equipo) => equipo.reduce((total, j) => total + j.puntos, 0);

  if (cargando) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'white' }}>Conectando con Supabase...</div>;
  }

  return (
    <div style={{ padding: '50px 20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      
      <h1 style={{ fontSize: '24px', lineHeight: '1.3', margin: '0 0 20px 0', color: '#ffffff', textAlign: 'center' }}>
        ⚽ Mezclador de Fútbol 5 ⚽ 
      </h1>

      {/* BOTONES AUXILIARES DE GESTIÓN */}
      {!equiposListos && !modoPersonalizado && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setMostrarGestion(!mostrarGestion)}
            style={{ flex: 1, padding: '10px', backgroundColor: '#495057', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            {mostrarGestion ? '▲ Ocultar Panel' : '⚙️ Administrar DB'}
          </button>
          
          <button 
            onClick={() => setModoPersonalizado(true)}
            style={{ flex: 1, padding: '10px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            📝 Partido Personalizado
          </button>
        </div>
      )}

      {/* PANEL DE GESTIÓN (AÑADIR/BORRAR BASE DE DATOS GENERAL) */}
      {mostrarGestion && !equiposListos && !modoPersonalizado && (
        <div style={{ background: '#212529', padding: '15px', borderRadius: '8px', border: '1px solid #343a40', marginBottom: '25px', color: 'white' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Añadir nuevo jugador al sistema:</h4>
          <form onSubmit={agregarJugador} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Nombre..." 
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #495057', backgroundColor: '#343a40', color: 'white' }}
            />
            <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>＋</button>
          </form>

          <h4 style={{ margin: '15px 0 5px 0' }}>Eliminar de la Base de Datos:</h4>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {jugadores.map(j => (
              <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #343a40', fontSize: '13px' }}>
                <span>{j.nombre}</span>
                <button onClick={(e) => eliminarJugador(j.id, j.nombre, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODO NUEVOS INTEGRANTES: MODO PARTIDO PERSONALIZADO */}
      {modoPersonalizado && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Configuración Manual</h2>
            <button onClick={resetearTodo} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
          </div>
          <p style={{ color: '#aaa', fontSize: '13px' }}>Asigná a los jugadores tocando las letras correspondientes de cada equipo:</p>

          {/* VISTA PREVIA DE LOS EQUIPOS EN CONSTRUCCIÓN */}
          <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
            <div style={{ flex: 1, background: '#e3f2fd', padding: '10px', borderRadius: '6px', color: '#333' }}>
              <strong style={{ color: '#0d47a1' }}>A ({equipoA.length}/5):</strong>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>{equipoA.map(j => j.nombre).join(', ') || 'Vacío'}</div>
            </div>
            <div style={{ flex: 1, background: '#ffebee', padding: '10px', borderRadius: '6px', color: '#333' }}>
              <strong style={{ color: '#b71c1c' }}>B ({equipoB.length}/5):</strong>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>{equipoB.map(j => j.nombre).join(', ') || 'Vacío'}</div>
            </div>
          </div>

          {/* SELECCIÓN MANUAL DE JUGADORES */}
          <div style={{ margin: '15px 0', maxHeight: '350px', overflowY: 'auto' }}>
            {jugadores.map(j => {
              const enA = equipoA.some(x => x.id === j.id);
              const enB = equipoB.some(x => x.id === j.id);
              return (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '6px', background: '#f8f9fa', borderRadius: '6px', color: '#333' }}>
                  <span style={{ fontWeight: (enA || enB) ? 'bold' : 'normal' }}>{j.nombre}</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => asignarAEquipoManual(j, 'A')} style={{ padding: '6px 12px', backgroundColor: enA ? '#007bff' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>A</button>
                    <button onClick={() => asignarAEquipoManual(j, 'B')} style={{ padding: '6px 12px', backgroundColor: enB ? '#dc3545' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>B</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTONES DE CARGA DE RESULTADOS DIRECTOS */}
          <div style={{ marginTop: '20px', padding: '15px', background: '#212529', borderRadius: '8px', border: '1px solid #343a40' }}>
            <h4 style={{ marginTop: 0, textAlign: 'center', color: 'white' }}>🏆 Registrar Carga Manual</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button disabled={actualizando || equipoA.length === 0} onClick={() => registrarResultado('ganaA')} style={{ padding: '10px', backgroundColor: '#0d47a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ganó el Equipo A (+3 pts)
              </button>
              <button disabled={actualizando || equipoB.length === 0} onClick={() => registrarResultado('ganaB')} style={{ padding: '10px', backgroundColor: '#b71c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ganó el Equipo B (+3 pts)
              </button>
              <button disabled={actualizando || (equipoA.length === 0 && equipoB.length === 0)} onClick={() => registrarResultado('empate')} style={{ padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Hubo Empate (+1 pt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLUJO ESTÁNDAR: SELECCIÓN DE CONFIRMADOS (SNAKE) */}
      {!equiposListos && !modoPersonalizado && (
        <div>
          <h2>Anote los 10 confirmados ({confirmados.length} / 10)</h2>
          <div style={{ margin: '20px 0' }}>
            {jugadores.map(jugador => {
              const yaConfirmo = confirmados.some(c => c.id === jugador.id);
              return (
                <div 
                  key={jugador.id}
                  onClick={() => anotadoConfirmado(jugador)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: yaConfirmo ? '#28a745' : '#f8f9fa',
                    color: yaConfirmo ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: yaConfirmo ? 'bold' : 'normal'
                  }}
                >
                  <span>{jugador.nombre}</span>
                  <span>{jugador.puntos} pts</span>
                </div>
              );
            })}
          </div>

          <button
            disabled={confirmados.length !== 10}
            onClick={armarEquiposSerpentina}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: confirmados.length === 10 ? '#007bff' : '#555',
              color: 'white',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: confirmados.length === 10 ? 'pointer' : 'not-allowed'
            }}
          >
            🔀 Generar Equipos Parejos
          </button>
        </div>
      )}

      {/* VISTA DE PUNTOS LUEGO DE SERPENTINA ESTÁNDAR */}
      {equiposListos && !modoPersonalizado && (
        <div>
          <h2>Equipos Listos</h2>
          
          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9', marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0d47a1' }}>EQUIPO A</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {equipoA.map(j => <li key={j.id} style={{ padding: '4px 0', color: '#333' }}>• {j.nombre} ({j.puntos} pts)</li>)}
            </ul>
            <hr style={{ border: '0', borderTop: '1px solid #90caf9', margin: '10px 0' }} />
            <strong style={{ color: '#333' }}>Nivel Total: {calcularTotalPuntos(equipoA)} pts</strong>
          </div>

          <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', border: '1px solid #ef9a9a', marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#b71c1c' }}>EQUIPO B</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {equipoB.map(j => <li key={j.id} style={{ padding: '4px 0', color: '#333' }}>• {j.nombre} ({j.puntos} pts)</li>)}
            </ul>
            <hr style={{ border: '0', borderTop: '1px solid #ef9a9a', margin: '10px 0' }} />
            <strong style={{ color: '#333' }}>Nivel Total: {calcularTotalPuntos(equipoB)} pts</strong>
          </div>

          <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: '#333' }}>🏆 Registrar Resultado</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button disabled={actualizando} onClick={() => registrarResultado('ganaA')} style={{ padding: '10px', backgroundColor: '#0d47a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {actualizando ? 'Guardando...' : 'Ganó Equipo A (+3 pts)'}
              </button>
              <button disabled={actualizando} onClick={() => registrarResultado('ganaB')} style={{ padding: '10px', backgroundColor: '#b71c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {actualizando ? 'Guardando...' : 'Ganó Equipo B (+3 pts)'}
              </button>
              <button disabled={actualizando} onClick={() => registrarResultado('empate')} style={{ padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {actualizando ? 'Guardando...' : 'Hubo Empate (+1 pt)'}
              </button>
            </div>
          </div>

          <button
            onClick={resetearTodo}
            style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Anular y Volver al Inicio
          </button>
        </div>
      )}
    </div>
  );
}