import React, { useState, useEffect } from 'react';
import './App.css';

interface Scheduler {
  id: number;
  time: string;
  status: string;
  statusLead: string;
  leadId: string;
}

interface Day {
  id: number;
  date: string;
  dayOfWeek: string;
  schedulers: Scheduler[];
}

interface CustomError extends Error {
  cause?: {
    code: number;
  };
}

function App() {
  const [username, setUsername] = useState('');
  const [date, setDate] = useState('');
  const [leadId, setLeadId] = useState('');
  const [status, setStatus] = useState('');
  const [statusLead, setStatusLead] = useState('');
  const [data, setData] = useState<Day[] | null>(null);
  const [result, setResult] = useState<Scheduler | null>(null);
  const [blockStatus, setBlockStatus] = useState({
    leadIdBlock: '',
    statusBlock: '',
    statusLeadBlock: '',
  });
  const [selectedLead, setSelectedLead] = useState<Scheduler | null>(null);
  const [formattedDateToFilter, setFormattedDateToFilter] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    setDate(today);
  }, []);

  function formatDateToFetch(date: string): string {
    const [year, month, day] = date.split('-');
    return `${month}-${day}-${year}`;
  }

  function formatDateToFilter(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }
  

  async function fetchData(username: string, date: string) {
    try {
      const formattedDate = formatDateToFetch(date);
      console.log('Получение данных фетч')

      const formattedDateToFilter = formatDateToFilter(date);
      setFormattedDateToFilter(formattedDateToFilter);

      const response = await fetch(
        `https://urban-bot2.zudov.pro/api/expert/getScheduler?username=${username}&dateStart=${formattedDate}`,
      );
      if (!response.ok) {
        throw new Error(
          `Проблемы с получением данных под именем: ${username}, число: ${date}. Status: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      setData(data);
      return data;
      console.log('Данные фетч получены');
    } catch (error: unknown) {
      console.error('Проблемы с подключением:', error);
      if (error instanceof Error) {
        const customError = error as CustomError;
        if (customError.cause && customError.cause.code) {
          console.error('Код ошибки:', customError.cause.code);
        }
      }
      return null;
    }
  }

  async function getLeadByLeadId(data: Day[], id: string) {
    if (!data) return;

    for (const day of data) {
      for (const scheduler of day.schedulers) {
        if (scheduler.leadId === id) {
          setResult(scheduler);
          setBlockStatus((prev) => ({ ...prev, leadIdBlock: 'green' }));
          return scheduler;
        }
      }
    }
    console.log('Lead не найден');
    setResult(null);
    setBlockStatus((prev) => ({ ...prev, leadIdBlock: 'red' }));
    return null;
  }

  async function getLastLeadByStatus(data: Day[], status: string) {
    if (!data) return;

    let lastLead = null;

    for (const day of data) {
      for (const scheduler of day.schedulers) {
        if (scheduler.status === status) {
          lastLead = scheduler;
        }
      }
    }

    if (lastLead) {
      setResult(lastLead);
      setBlockStatus((prev) => ({ ...prev, statusBlock: 'green' }));
      return lastLead;
    } else {
      console.log('Lead не найден');
      setResult(null);
      setBlockStatus((prev) => ({ ...prev, statusBlock: 'red' }));
      return null;
    }
  }

  async function getLastLeadByStatusLead(data: Day[], statusLead: string) {
    if (!data) return;

    let lastLead = null;

    for (const day of data) {
      for (const scheduler of day.schedulers) {
        if (scheduler.statusLead === statusLead) {
          lastLead = scheduler;
        }
      }
    }

    if (lastLead) {
      setResult(lastLead);
      setBlockStatus((prev) => ({ ...prev, statusLeadBlock: 'green' }));
      return lastLead;
    } else {
      console.log('Lead не найден');
      setResult(null);
      setBlockStatus((prev) => ({ ...prev, statusLeadBlock: 'red' }));
      return null;
    }
  }

  const handleFetchData = async () => {
    console.log('Колбек на получение фетч');
    await fetchData(username, date);
  };

  const handleGetLeadByLeadId = async () => {
    if (data) {
      await getLeadByLeadId(data, leadId);
    }
  };

  const handleGetLastLeadByStatus = async () => {
    if (data) {
      await getLastLeadByStatus(data, status);
    }
  };

  const handleGetLastLeadByStatusLead = async () => {
    if (data) {
      await getLastLeadByStatusLead(data, statusLead);
    }
  };

  const handleSelectLead = (lead: Scheduler) => {
    setSelectedLead(lead);
  };

  const handlePostRequest = (id: number, status: number) => {
    try {
      fetch('https://urban-bot2.zudov.pro/api/expert/setStatusScheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id, status: status }),
      }).then(() => {
        handleFetchData();
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const renderLeads = (leads: Scheduler[]) => {
    return leads.map((lead) => (
      <div
        key={lead.id}
        className={`lead-block ${selectedLead?.id === lead.id ? 'selected' : ''}`}
        onClick={() => handleSelectLead(lead)}
      >
        <div>ID: {lead.id}</div>
        <div>Time: {lead.time}</div>
        <div className={`status ${lead.status === 'Подтвержден' && !lead.statusLead ? 'bug' : 'ok'}`}>
          Статус: {lead.status}
        </div>
        <div className={`status-lead ${lead.status === 'Свободен' && lead.statusLead ? 'bug' : 'ok'}`}>
          Status Lead: {lead.statusLead}
        </div>
        <div className={`lead-id ${lead.status === 'Назначен урок' && !lead.leadId ? 'bug' : 'ok'}`}>
          Lead ID: {lead.leadId}
        </div>
        {selectedLead?.id === lead.id && (
          <div>
            <button onClick={() => handlePostRequest(lead.id, 0)}>Освободить</button>
            <button onClick={() => handlePostRequest(lead.id, 4)}>Подтвердить</button>
            <button onClick={() => handlePostRequest(lead.id, 3)}>Отклонить</button>
            <button onClick={() => handlePostRequest(lead.id, 1)}>Занят</button>
          </div>
        )}
      </div>
    ));
  };

  const filterLeadsByCurrentDate = (data: Day[]) => {
    return data.find((day) => day.date === formattedDateToFilter)?.schedulers || [];
  };

  return (
    <div className="App">
      <div className="input-block">
        <input
          type="text"
          placeholder="Телегам"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="date"
          data-date=""
          data-date-format="MMMM DD YYYY"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={handleFetchData}>Получить данные</button>
      </div>
      <h6>Данные не обновляются в реальном времени, для обновления данных нажмите кнопку получить данные или кнопку действия, будь-то освободить, подтвердить и тд</h6>
      <div className="function-block">
        <div className="function-item" style={{ backgroundColor: blockStatus.leadIdBlock }}>
          <input
            type="text"
            placeholder="id лида"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          />
          <button onClick={handleGetLeadByLeadId}>Получить лид по Битрикс ID</button>
        </div>
        <div className="function-item" style={{ backgroundColor: blockStatus.statusBlock }}>
          <input
            type="text"
            placeholder="Статус"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <button onClick={handleGetLastLeadByStatus}>Получить лид по статусу</button>
        </div>
        <div className="function-item" style={{ backgroundColor: blockStatus.statusLeadBlock }}>
          <input
            type="text"
            placeholder="Подстатус"
            value={statusLead}
            onChange={(e) => setStatusLead(e.target.value)}
          />
          <button onClick={handleGetLastLeadByStatusLead}>Получить лид по <b>status lead</b></button>
        </div>
      </div>
      <div className="result-block">
        {result ? (
          <div>
            <h3>Найденный лид</h3>
            {renderLeads([result])}
          </div>
        ) : (
          <div>
            <h3>Все лиды</h3>
            {data && (
              <div>
                <h4>{formattedDateToFilter}</h4>
                {renderLeads(filterLeadsByCurrentDate(data))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
