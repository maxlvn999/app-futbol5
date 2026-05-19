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

  // Estados nuevos para la gestión de jugadores
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarGestion, setMostrarGestion] = useState(false);

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

  // Función para agregar un jugador a Supabase
  const agregarJugador = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    try {
      // Insertamos el jugador con 0 puntos por defecto
      const { error } = await supabase
        .from('jugadores')
        .insert([{ nombre: nuevoNombre.trim(), puntos: 0 }]);

      if (error) {
        alert('Error al agregar: ' + error.message);
      } else {
        setNuevoNombre(''); // Limpiamos el input
        await obtenerJugadores(); // Recargamos la lista
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Función para borrar un jugador de Supabase
  const eliminarJugador = async (id, nombre, e) => {
    // Evitamos que al hacer clic en la X también se seleccione el jugador
    e.stopPropagation(); 
    
    if (!confirm(`¿Seguro que querés borrar a ${nombre} del sistema? Se perderán sus puntos.`)) return;

    try {
      const { error } = await supabase
        .from('jugadores')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        // Si estaba en la lista de confirmados del día, lo sacamos
        setConfirmados(confirmados.filter(c => c.id !== id));
        setEquiposListos(false);
        await obtenerJugadores(); // Recargamos la lista
      }
    } catch (err) {
      console.error(err);
    }
  };

  const anotarConfirmado = (jugador) => {
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

  // Función corregida para registrar el resultado
  const registrarResultado = async (resultado) => {
    if (!confirm('¿Estás seguro de registrar este resultado? Esto actualizará la tabla general.')) return;
    setActualizando(true);

    try {
      const promesas = confirmados.map(jugador => {
        let nuevosPuntos = jugador.puntos;

        if (resultado === 'empate') {
          nuevosPuntos += 1;
        } else if (resultado === 'ganaA' && equipoA.some(j => j.id === jugador.id)) {
          nuevosPuntos += 3;
        } else if (resultado === 'ganaB' && equipoB.some(j => j.id === jugador.id)) {
          nuevosPuntos += 3;
        }

        // CORREGIDO: Sintaxis limpia para la actualización por ID
        return supabase
          .from('jugadores')
          .update({ puntos: nuevosPuntos })
          .eq('id', jugador.id);
      });

      await Promise.all(promesas);
      alert('¡Puntajes actualizados con éxito en la nube! 🏆');
      setConfirmados([]);
      setEquiposListos(false);
      await obtenerJugadores();
    } catch (err) {
      console.error('Error al actualizar puntos:', err);
      alert('Hubo un error al guardar los puntos.');
    } finally {
      setActualizando(false);
    }
  };

  const calcularTotalPuntos = (equipo) => equipo.reduce((total, j) => total + j.puntos, 0);

  if (cargando) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Conectando con Supabase...</div>;
  }

  return (
    <div style={{ padding: '50px 20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      
      <h1 style={{ fontSize: '24px', lineHeight: '1.3', margin: '0 0 20px 0', color: '#ffffff', textAlign: 'center' }}>
        ⚽ Mezclador de Fútbol 5 ⚽ 
      </h1>

      {/* BOTÓN PARA COLAPSAR/MOSTRAR LA GESTIÓN */}
      <button 
        onClick={() => setMostrarGestion(!mostrarGestion)}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '20px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {mostrarGestion ? '▲ Ocultar Panel de Jugadores' : '⚙️ Administrar Lista de Jugadores'}
      </button>

      {/* FORMULARIO PARA AÑADIR JUGADORES */}
      {mostrarGestion && (
        <form onSubmit={agregarJugador} style={{ display: 'flex', gap: '10px', marginBottom: '25px', padding: '15px', background: '#f1f3f5', borderRadius: '6px', border: '1px solid #dee2e6' }}>
          <input 
            type="text" 
            placeholder="Nombre del nuevo jugador..." 
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          />
          <button 
            type="submit"
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ＋ Añadir
          </button>
        </form>
      )}

      {!equiposListos ? (
        <div>
          <h2>Anote los 10 confirmados ({confirmados.length} / 10)</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Hacé clic en los nombres según el orden en que avisaron en WhatsApp:</p>
          
          <div style={{ margin: '20px 0' }}>
            {jugadores.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic' }}>No hay jugadores cargados. ¡Usa el panel de arriba para empezar!</p>
            ) : (
              jugadores.map(jugador => {
                const yaConfirmo = confirmados.some(c => c.id === jugador.id);
                return (
                  <div 
                    key={jugador.id}
                    onClick={() => anotarConfirmado(jugador)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* BOTÓN ELIMINAR (Solo visible si el panel de gestión está abierto) */}
                      {mostrarGestion && (
                        <span 
                          onClick={(e) => eliminarJugador(jugador.id, jugador.nombre, e)}
                          style={{ color: '#dc3545', fontWeight: 'bold', padding: '0 5px', cursor: 'pointer', fontSize: '16px' }}
                          title="Eliminar jugador del sistema"
                        >
                          ❌
                        </span>
                      )}
                      <span>{jugador.nombre}</span>
                    </div>
                    <span>{jugador.puntos} pts</span>
                  </div>
                );
              })
            )}
          </div>

          <button
            disabled={confirmados.length !== 10}
            onClick={armarEquiposSerpentina}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: confirmados.length === 10 ? '#007bff' : '#ccc',
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
      ) : (
        <div>
          <h2>Equipos Listos</h2>
          
          {/* VISTA EQUIPO A */}
          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9', marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0d47a1' }}>EQUIPO A</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {equipoA.map(j => <li key={j.id} style={{ padding: '4px 0' }}>• {j.nombre} ({j.puntos} pts)</li>)}
            </ul>
            <hr style={{ border: '0', borderTop: '1px solid #90caf9', margin: '10px 0' }} />
            <strong>Nivel Total: {calcularTotalPuntos(equipoA)} pts</strong>
          </div>

          {/* VISTA EQUIPO B */}
          <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', border: '1px solid #ef9a9a', marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#b71c1c' }}>EQUIPO B</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {equipoB.map(j => <li key={j.id} style={{ padding: '4px 0' }}>• {j.nombre} ({j.puntos} pts)</li>)}
            </ul>
            <hr style={{ border: '0', borderTop: '1px solid #ef9a9a', margin: '10px 0' }} />
            <strong>Nivel Total: {calcularTotalPuntos(equipoB)} pts</strong>
          </div>

          {/* CARGA DE RESULTADOS */}
          <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>🏆 Registrar Resultado del Partido</h3>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>Al elegir una opción, se guardarán los nuevos puntajes en Supabase.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                disabled={actualizando}
                onClick={() => registrarResultado('ganaA')}
                style={{ padding: '10px', backgroundColor: '#0d47a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {actualizando ? 'Guardando...' : 'Ganó Equipo A (+3 pts)'}
              </button>
              
              <button 
                disabled={actualizando}
                onClick={() => registrarResultado('ganaB')}
                style={{ padding: '10px', backgroundColor: '#b71c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {actualizando ? 'Guardando...' : 'Ganó Equipo B (+3 pts)'}
              </button>
              
              <button 
                disabled={actualizando}
                onClick={() => registrarResultado('empate')}
                style={{ padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {actualizando ? 'Guardando...' : 'Hubo Empate (+1 pt a todos)'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setEquiposListos(false)}
            style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Anular y Modificar Confirmados
          </button>
        </div>
      )}
    </div>
  );
}