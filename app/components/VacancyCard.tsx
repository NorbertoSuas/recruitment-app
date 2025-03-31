import React, { useState, useEffect } from 'react';
import { Button, Modal, Table, Badge } from 'react-bootstrap';
import { Card } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { FaUserTie, FaMapMarkerAlt, FaBriefcase, FaClock, FaGraduationCap, FaTools } from 'react-icons/fa';

interface Candidate {
    _id: string;
    first_name: string;
    last_name: string;
    experience: number;
    skills: string;
    status: string;
    resume?: string;
}

interface VacancyCardProps {
    vacancy: {
        _id: string;
        title: string;
        department: string;
        location: string;
        type: string;
        experience: string;
        skills: string[];
    };
}

const VacancyCard: React.FC<VacancyCardProps> = ({ vacancy }) => {
    const [showModal, setShowModal] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCandidates = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:5000/api/vacancies/${vacancy._id}/candidates`);
            if (!response.ok) {
                throw new Error('Failed to fetch candidates');
            }
            const data = await response.json();
            setCandidates(data);
        } catch (err) {
            setError('Error fetching candidates');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCandidates = () => {
        setShowModal(true);
        fetchCandidates();
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <>
            <Card className="mb-3 vacancy-card">
                <Card.Body>
                    <Card.Title className="d-flex justify-content-between align-items-center">
                        <span><FaUserTie className="me-2" />{vacancy.title}</span>
                    </Card.Title>
                    <Card.Text>
                        <div className="mb-2">
                            <FaBriefcase className="me-2" />{vacancy.department}
                        </div>
                        <div className="mb-2">
                            <FaMapMarkerAlt className="me-2" />{vacancy.location}
                        </div>
                        <div className="mb-2">
                            <FaClock className="me-2" />{vacancy.type}
                        </div>
                        <div className="mb-2">
                            <FaGraduationCap className="me-2" />Experience: {vacancy.experience}
                        </div>
                        <div className="mb-3">
                            <FaTools className="me-2" />Skills:
                            <div className="mt-1">
                                {vacancy.skills.map((skill, index) => (
                                    <Badge bg="info" className="me-1 mb-1" key={index}>
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </Card.Text>
                    <div className="d-flex justify-content-end">
                        <Button variant="outline-primary" className="me-2" onClick={handleViewCandidates}>
                            View Candidates
                        </Button>
                        <Button variant="primary">View Details</Button>
                    </div>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Candidates for {vacancy.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loading && (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                        </div>
                    )}
                    
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {!loading && !error && candidates.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-muted">No candidates have applied for this position yet.</p>
                        </div>
                    )}

                    {!loading && !error && candidates.length > 0 && (
                        <Table responsive>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Experience</th>
                                    <th>Skills</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((candidate) => (
                                    <tr key={candidate._id}>
                                        <td>{`${candidate.first_name} ${candidate.last_name}`}</td>
                                        <td>{candidate.experience} years</td>
                                        <td>
                                            {candidate.skills.split(', ').map((skill, index) => (
                                                <Badge bg="info" className="me-1 mb-1" key={index}>
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </td>
                                        <td>
                                            <Badge bg={getStatusBadgeVariant(candidate.status)}>
                                                {candidate.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-1"
                                                onClick={() => window.open(`/candidates/${candidate._id}`, '_blank')}
                                            >
                                                View Profile
                                            </Button>
                                            {candidate.resume && (
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => window.open(candidate.resume, '_blank')}
                                                >
                                                    View Resume
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default VacancyCard; 